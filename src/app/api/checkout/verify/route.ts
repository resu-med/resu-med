import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_PRODUCTS } from '@/lib/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.items.data.price.product']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { planId } = session.metadata || {};
    const plan = planId ? STRIPE_PRODUCTS[planId as keyof typeof STRIPE_PRODUCTS] : null;

    const sessionDetails = {
      sessionId: session.id,
      planName: plan?.name || 'Unknown Plan',
      planId: planId,
      amount: plan?.price || 0,
      status: session.payment_status,
      customerEmail: session.customer_email,
      nextBilling: session.subscription
        ? new Date((session.subscription as any).current_period_end * 1000).toLocaleDateString()
        : null,
    };

    return NextResponse.json(sessionDetails);
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}