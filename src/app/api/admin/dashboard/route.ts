import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { verifyAdminToken, createAdminAPIResponse } from '@/lib/admin-middleware';
import { getSubscriptionStats } from '@/lib/subscription-usage-tracker';

export async function GET(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin access
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    await initializeDatabase();

    // Get user statistics
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      verifiedUsers,
      adminUsers,
      activeUsersLast30Days
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE`,
      sql`SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as count FROM users WHERE email_verified = true`,
      sql`SELECT COUNT(*) as count FROM users WHERE is_admin = true`,
      sql`SELECT COUNT(*) as count FROM users WHERE last_login_at >= CURRENT_DATE - INTERVAL '30 days'`
    ]);

    // Get recent users with subscription data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const recentUsers = await sql`
      SELECT
        u.id, u.email, u.name, u.email_verified, u.is_admin, u.created_at, u.last_login_at,
        s.plan_id, s.tier, s.status,
        usage.job_searches, usage.ai_optimizations, usage.cover_letters_generated, usage.profile_exports
      FROM users u
      LEFT JOIN user_subscriptions s ON u.id = s.user_id
      LEFT JOIN user_usage usage ON u.id = usage.user_id AND usage.month = ${currentMonth}
      ORDER BY u.created_at DESC
      LIMIT 10
    `;

    // Get user growth data (last 7 days)
    const userGrowth = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get subscription stats
    const subscriptionStats = await getSubscriptionStats();

    return NextResponse.json({
      user_stats: {
        total_users: parseInt(totalUsers[0].count),
        new_users_today: parseInt(newUsersToday[0].count),
        new_users_this_week: parseInt(newUsersThisWeek[0].count),
        verified_users: parseInt(verifiedUsers[0].count),
        admin_users: parseInt(adminUsers[0].count),
        active_users_last_30_days: parseInt(activeUsersLast30Days[0].count)
      },
      recent_users: recentUsers,
      user_growth: userGrowth.map(row => ({
        date: row.date,
        new_users: parseInt(row.new_users)
      })),
      subscription_stats: subscriptionStats
    });

  } catch (error) {
    console.error('Admin dashboard fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}