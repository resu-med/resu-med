import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '@/lib/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { action, subscriptionId, userId } = await request.json();

    if (!action || !subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'cancel':
        // Cancel subscription at period end
        result = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        break;

      case 'resume':
        // Resume subscription (remove cancel_at_period_end)
        result = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
        break;

      case 'cancel_immediately':
        // Cancel subscription immediately
        result = await stripe.subscriptions.cancel(subscriptionId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // TODO: Update user subscription status in your database
    // Example:
    // await updateUserSubscription(userId, {
    //   status: result.status,
    //   cancelAtPeriodEnd: result.cancel_at_period_end,
    //   currentPeriodEnd: new Date(result.current_period_end * 1000),
    // });

    return NextResponse.json({
      success: true,
      subscription: {
        id: result.id,
        status: result.status,
        cancelAtPeriodEnd: result.cancel_at_period_end,
        currentPeriodEnd: result.current_period_end,
      },
    });
  } catch (error) {
    console.error('Subscription management error:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}

// Get subscription details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      customer: subscription.customer,
    });
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve subscription' },
      { status: 500 }
    );
  }
}