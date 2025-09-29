import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { verifyAdminToken, createAdminAPIResponse } from '@/lib/admin-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔧 Admin toggle API called for user ID:', params.id);

    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent admin from removing their own admin status
    if (authResult.user?.userId === userId) {
      return NextResponse.json({
        error: 'Cannot toggle admin status on your own account'
      }, { status: 400 });
    }

    await initializeDatabase();

    // Get current user data
    const userResult = await sql`
      SELECT id, email, is_admin
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult[0];
    const newAdminStatus = !user.is_admin;

    console.log(`🔄 Toggling admin status for ${user.email} from ${user.is_admin} to ${newAdminStatus}`);

    // Update user's admin status
    await sql`
      UPDATE users
      SET is_admin = ${newAdminStatus}, updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`✅ Successfully ${newAdminStatus ? 'granted' : 'revoked'} admin access for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Admin access ${newAdminStatus ? 'granted to' : 'revoked from'} ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: newAdminStatus
      }
    });

  } catch (error) {
    console.error('Admin toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle admin status' },
      { status: 500 }
    );
  }
}