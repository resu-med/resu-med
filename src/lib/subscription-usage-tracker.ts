import { sql } from '@/lib/database';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

export interface UserUsage {
  user_id: number;
  month: string;
  job_searches: number;
  ai_optimizations: number;
  cover_letters_generated: number;
  profile_exports: number;
  last_job_search?: string;
  last_reset_date: string;
}

export interface UserSubscription {
  user_id: number;
  plan_id: string;
  tier: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface UserWithSubscription {
  id: number;
  email: string;
  name: string;
  email_verified: boolean;
  is_admin: boolean;
  subscription?: UserSubscription;
  usage?: UserUsage;
  created_at: string;
}

export async function initializeUserSubscription(userId: number): Promise<void> {
  if (!sql) return;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Create default subscription if not exists
    await sql`
      INSERT INTO user_subscriptions (user_id, plan_id, tier, status)
      VALUES (${userId}, 'free', 'free', 'active')
      ON CONFLICT (user_id) DO NOTHING
    `;

    // Create default usage tracking if not exists
    await sql`
      INSERT INTO user_usage (user_id, month)
      VALUES (${userId}, ${currentMonth})
      ON CONFLICT (user_id, month) DO NOTHING
    `;

    console.log(`✅ Initialized subscription for user ${userId}`);
  } catch (error) {
    console.error('Failed to initialize user subscription:', error);
  }
}

export async function trackUsage(
  userId: number,
  action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export'
): Promise<void> {
  if (!sql) return;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Initialize usage record if it doesn't exist
    await sql`
      INSERT INTO user_usage (user_id, month)
      VALUES (${userId}, ${currentMonth})
      ON CONFLICT (user_id, month) DO NOTHING
    `;

    // Update usage based on action
    switch (action) {
      case 'job-search':
        await sql`
          UPDATE user_usage
          SET job_searches = job_searches + 1,
              last_job_search = NOW(),
              updated_at = NOW()
          WHERE user_id = ${userId} AND month = ${currentMonth}
        `;
        break;
      case 'ai-optimization':
        await sql`
          UPDATE user_usage
          SET ai_optimizations = ai_optimizations + 1,
              updated_at = NOW()
          WHERE user_id = ${userId} AND month = ${currentMonth}
        `;
        break;
      case 'cover-letter':
        await sql`
          UPDATE user_usage
          SET cover_letters_generated = cover_letters_generated + 1,
              updated_at = NOW()
          WHERE user_id = ${userId} AND month = ${currentMonth}
        `;
        break;
      case 'export':
        await sql`
          UPDATE user_usage
          SET profile_exports = profile_exports + 1,
              updated_at = NOW()
          WHERE user_id = ${userId} AND month = ${currentMonth}
        `;
        break;
    }

    console.log(`📊 Tracked ${action} usage for user ${userId}`);
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
}

export async function canPerformAction(
  userId: number,
  action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export'
): Promise<boolean> {
  if (!sql) return false;

  try {
    // Check if user is admin or tester first - both have unlimited usage
    const privilegeCheck = await sql`
      SELECT is_admin, is_tester FROM users WHERE id = ${userId}
    `;

    if (privilegeCheck.length > 0 && (privilegeCheck[0].is_admin || privilegeCheck[0].is_tester)) {
      return true; // Admins and testers have unlimited usage for all features
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get user subscription and usage
    const result = await sql`
      SELECT
        s.plan_id,
        u.job_searches,
        u.ai_optimizations,
        u.cover_letters_generated,
        u.profile_exports
      FROM user_subscriptions s
      LEFT JOIN user_usage u ON s.user_id = u.user_id AND u.month = ${currentMonth}
      WHERE s.user_id = ${userId}
    `;

    if (result.length === 0) {
      // Initialize user subscription and allow action
      await initializeUserSubscription(userId);
      return true;
    }

    const userPlan = result[0];
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === userPlan.plan_id);

    if (!plan) return false;

    const usage = {
      job_searches: userPlan.job_searches || 0,
      ai_optimizations: userPlan.ai_optimizations || 0,
      cover_letters_generated: userPlan.cover_letters_generated || 0,
      profile_exports: userPlan.profile_exports || 0
    };

    // Check limits based on action
    switch (action) {
      case 'job-search':
        return plan.limits.jobSearchesPerMonth === -1 || usage.job_searches < plan.limits.jobSearchesPerMonth;
      case 'ai-optimization':
        return plan.limits.aiOptimizations === -1 || usage.ai_optimizations < plan.limits.aiOptimizations;
      case 'cover-letter':
        return plan.limits.coverLetters === -1 || usage.cover_letters_generated < plan.limits.coverLetters;
      case 'export':
        return plan.limits.profileExports === -1 || usage.profile_exports < plan.limits.profileExports;
      default:
        return false;
    }
  } catch (error) {
    console.error('Failed to check action permission:', error);
    return false;
  }
}

export async function getUsersWithSubscriptionData(): Promise<UserWithSubscription[]> {
  if (!sql) return [];

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const users = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.email_verified,
        u.is_admin,
        u.created_at,
        s.plan_id,
        s.tier,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        usage.job_searches,
        usage.ai_optimizations,
        usage.cover_letters_generated,
        usage.profile_exports,
        usage.last_job_search,
        usage.last_reset_date
      FROM users u
      LEFT JOIN user_subscriptions s ON u.id = s.user_id
      LEFT JOIN user_usage usage ON u.id = usage.user_id AND usage.month = ${currentMonth}
      ORDER BY u.created_at DESC
    `;

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified,
      is_admin: user.is_admin,
      created_at: user.created_at,
      subscription: user.plan_id ? {
        user_id: user.id,
        plan_id: user.plan_id,
        tier: user.tier,
        status: user.status,
        current_period_start: user.current_period_start,
        current_period_end: user.current_period_end,
        cancel_at_period_end: user.cancel_at_period_end
      } : undefined,
      usage: user.job_searches !== null ? {
        user_id: user.id,
        month: currentMonth,
        job_searches: user.job_searches || 0,
        ai_optimizations: user.ai_optimizations || 0,
        cover_letters_generated: user.cover_letters_generated || 0,
        profile_exports: user.profile_exports || 0,
        last_job_search: user.last_job_search,
        last_reset_date: user.last_reset_date
      } : undefined
    }));
  } catch (error) {
    console.error('Failed to get users with subscription data:', error);
    return [];
  }
}

export async function getSubscriptionStats() {
  if (!sql) return null;

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [subscriptionCounts, usageStats] = await Promise.all([
      sql`
        SELECT
          plan_id,
          COUNT(*) as count
        FROM user_subscriptions
        WHERE status = 'active'
        GROUP BY plan_id
      `,
      sql`
        SELECT
          SUM(job_searches) as total_job_searches,
          SUM(ai_optimizations) as total_ai_optimizations,
          SUM(cover_letters_generated) as total_cover_letters,
          SUM(profile_exports) as total_exports,
          COUNT(*) as active_users
        FROM user_usage
        WHERE month = ${currentMonth}
      `
    ]);

    return {
      subscription_counts: subscriptionCounts.reduce((acc: any, row: any) => {
        acc[row.plan_id] = parseInt(row.count);
        return acc;
      }, {}),
      usage_stats: {
        total_job_searches: parseInt(usageStats[0]?.total_job_searches || 0),
        total_ai_optimizations: parseInt(usageStats[0]?.total_ai_optimizations || 0),
        total_cover_letters: parseInt(usageStats[0]?.total_cover_letters || 0),
        total_exports: parseInt(usageStats[0]?.total_exports || 0),
        active_users: parseInt(usageStats[0]?.active_users || 0)
      }
    };
  } catch (error) {
    console.error('Failed to get subscription stats:', error);
    return null;
  }
}