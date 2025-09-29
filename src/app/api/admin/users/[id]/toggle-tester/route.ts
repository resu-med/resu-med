import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { verifyAdminToken, createAdminAPIResponse } from '@/lib/admin-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🧪 Tester toggle API called for user ID:', params.id);

    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify admin authentication (only admins can assign tester roles)
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return createAdminAPIResponse(authResult.error || 'Unauthorized');
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await initializeDatabase();

    // Get current user data
    const userResult = await sql`
      SELECT id, email, is_tester
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
    const newTesterStatus = !user.is_tester;

    console.log(`🔄 Toggling tester status for ${user.email} from ${user.is_tester} to ${newTesterStatus}`);

    // Update user's tester status
    await sql`
      UPDATE users
      SET is_tester = ${newTesterStatus}, updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`✅ Successfully ${newTesterStatus ? 'granted' : 'revoked'} tester access for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Tester access ${newTesterStatus ? 'granted to' : 'revoked from'} ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        isTester: newTesterStatus
      }
    });

  } catch (error) {
    console.error('Tester toggle error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle tester status' },
      { status: 500 }
    );
  }
}