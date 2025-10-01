import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    // Get user and subscription data
    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        s.plan_id,
        s.tier,
        s.status,
        s.stripe_subscription_id
      FROM users u
      LEFT JOIN user_subscriptions s ON u.id = s.user_id
      WHERE u.email = ${email.toLowerCase()}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result[0]
    });

  } catch (error) {
    console.error('Debug user check error:', error);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
}