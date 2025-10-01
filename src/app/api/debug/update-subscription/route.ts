import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, planId } = await request.json();

    if (!email || !planId) {
      return NextResponse.json(
        { error: 'Email and planId required' },
        { status: 400 }
      );
    }

    // Find user by email
    const users = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Update subscription
    await sql`
      UPDATE user_subscriptions
      SET plan_id = ${planId},
          tier = ${planId},
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    console.log(`✅ Manually updated subscription for user ${userId} to ${planId}`);

    return NextResponse.json({
      success: true,
      message: `Updated user ${email} to ${planId} plan`
    });

  } catch (error) {
    console.error('Debug subscription update error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}