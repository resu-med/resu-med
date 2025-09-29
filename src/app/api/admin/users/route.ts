import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { verifyAdminToken, createAdminAPIResponse } from '@/lib/admin-middleware';
import { getUsersWithSubscriptionData } from '@/lib/subscription-usage-tracker';

export async function GET(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin access (users endpoint should be admin-only, not accessible by testers)
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    await initializeDatabase();

    // Get query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build search query
    let whereClause = '';
    let searchParams: string[] = [];

    if (search) {
      whereClause = 'WHERE LOWER(email) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($2)';
      searchParams = [`%${search}%`, `%${search}%`];
    }

    // Get total count
    const countQuery = search
      ? await sql`SELECT COUNT(*) FROM users WHERE LOWER(email) LIKE LOWER(${`%${search}%`}) OR LOWER(name) LIKE LOWER(${`%${search}%`})`
      : await sql`SELECT COUNT(*) FROM users`;

    const totalUsers = parseInt(countQuery[0].count);

    // Get users with subscription data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usersQuery = search
      ? await sql`
          SELECT
            u.id, u.email, u.name, u.email_verified, u.is_admin, u.is_tester, u.last_login_at, u.created_at, u.updated_at,
            s.plan_id, s.tier, s.status,
            usage.job_searches, usage.ai_optimizations, usage.cover_letters_generated, usage.profile_exports
          FROM users u
          LEFT JOIN user_subscriptions s ON u.id = s.user_id
          LEFT JOIN user_usage usage ON u.id = usage.user_id AND usage.month = ${currentMonth}
          WHERE LOWER(u.email) LIKE LOWER(${`%${search}%`}) OR LOWER(u.name) LIKE LOWER(${`%${search}%`})
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT
            u.id, u.email, u.name, u.email_verified, u.is_admin, u.is_tester, u.last_login_at, u.created_at, u.updated_at,
            s.plan_id, s.tier, s.status,
            usage.job_searches, usage.ai_optimizations, usage.cover_letters_generated, usage.profile_exports
          FROM users u
          LEFT JOIN user_subscriptions s ON u.id = s.user_id
          LEFT JOIN user_usage usage ON u.id = usage.user_id AND usage.month = ${currentMonth}
          ORDER BY u.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    return NextResponse.json({
      users: usersQuery,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin access
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (authResult.user?.userId === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await initializeDatabase();

    // Delete user (CASCADE will handle related records)
    const result = await sql`
      DELETE FROM users
      WHERE id = ${userId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}