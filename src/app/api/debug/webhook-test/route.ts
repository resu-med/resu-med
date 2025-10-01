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

    console.log('🔧 DEBUG: Testing webhook upgrade for email:', email);

    // Find user by email
    const users = await sql`
      SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (users.length === 0) {
      console.log('❌ User not found:', email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    console.log('✅ Found user:', user);

    // Check existing subscription
    const existingSubscription = await sql`
      SELECT * FROM user_subscriptions WHERE user_id = ${user.id}
    `;

    console.log('🔍 Existing subscription:', existingSubscription);

    // Simulate webhook upgrade to Ultimate
    if (existingSubscription.length === 0) {
      // Create new subscription
      await sql`
        INSERT INTO user_subscriptions (
          user_id, plan_id, tier, status, current_period_start, current_period_end,
          cancel_at_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at
        ) VALUES (
          ${user.id},
          'ultimate',
          'ultimate',
          'active',
          NOW(),
          NOW() + INTERVAL '30 days',
          false,
          'cus_test_' || ${user.id},
          'sub_test_' || ${user.id},
          NOW(),
          NOW()
        )
      `;
      console.log('✅ Created new Ultimate subscription for user', user.id);
    } else {
      // Update existing subscription
      await sql`
        UPDATE user_subscriptions
        SET plan_id = 'ultimate',
            tier = 'ultimate',
            status = 'active',
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `;
      console.log('✅ Updated subscription to Ultimate for user', user.id);
    }

    return NextResponse.json({
      success: true,
      message: `Upgraded ${email} to Ultimate plan`,
      user: user
    });

  } catch (error) {
    console.error('Debug webhook test error:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook upgrade' },
      { status: 500 }
    );
  }
}