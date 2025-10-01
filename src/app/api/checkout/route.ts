import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_PRODUCTS } from '@/lib/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, userEmail } = await request.json();

    console.log('🔍 Checkout request:', { planId, userId, userEmail });
    console.log('🔍 Available plans:', Object.keys(STRIPE_PRODUCTS));

    // Validate plan
    if (!planId || !STRIPE_PRODUCTS[planId as keyof typeof STRIPE_PRODUCTS]) {
      console.error('❌ Invalid plan:', planId, 'Available:', Object.keys(STRIPE_PRODUCTS));
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const plan = STRIPE_PRODUCTS[planId as keyof typeof STRIPE_PRODUCTS];

    console.log('🔍 Selected plan:', plan);
    console.log('🔍 Plan stripePriceId:', plan.stripePriceId);

    // Don't create checkout for free plan
    if (plan.id === 'free') {
      console.log('❌ Attempted checkout for free plan');
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planId: planId,
      },
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/account/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/account/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId,
        },
      },
    });

    console.log('✅ Stripe session created:', { id: session.id, url: session.url });
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}