import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { verifyAdminToken, createAdminAPIResponse } from '@/lib/admin-middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin access
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await initializeDatabase();

    // Get user details
    const userResult = await sql`
      SELECT
        u.id, u.email, u.name, u.email_verified, u.is_admin, u.is_tester,
        u.last_login_at, u.created_at, u.updated_at,
        p.first_name, p.last_name, p.phone, p.location,
        p.website, p.linkedin, p.github
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = ${userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Get user's experiences count
    const experiencesCount = await sql`
      SELECT COUNT(*) FROM experiences WHERE user_id = ${userId}
    `;

    // Get user's education count
    const educationCount = await sql`
      SELECT COUNT(*) FROM education WHERE user_id = ${userId}
    `;

    // Get user's skills count
    const skillsCount = await sql`
      SELECT COUNT(*) FROM skills WHERE user_id = ${userId}
    `;

    return NextResponse.json({
      user: {
        ...user,
        experiencesCount: parseInt(experiencesCount[0].count),
        educationCount: parseInt(educationCount[0].count),
        skillsCount: parseInt(skillsCount[0].count)
      }
    });

  } catch (error) {
    console.error('Admin user fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin access
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { isAdmin, isTester, emailVerified } = body;

    // Prevent admin from removing their own admin status
    if (authResult.user?.userId === userId && isAdmin === false) {
      return NextResponse.json({
        error: 'Cannot remove admin status from your own account'
      }, { status: 400 });
    }

    await initializeDatabase();

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (typeof isAdmin === 'boolean') {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(isAdmin);
    }

    if (typeof isTester === 'boolean') {
      updates.push(`is_tester = $${paramIndex++}`);
      values.push(isTester);
    }

    if (typeof emailVerified === 'boolean') {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(emailVerified);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await sql.unsafe(query, values);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}