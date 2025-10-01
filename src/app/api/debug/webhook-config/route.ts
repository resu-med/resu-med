import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    return NextResponse.json({
      webhookSecretConfigured: !!webhookSecret,
      webhookSecretPrefix: webhookSecret?.substring(0, 10),
      stripeSecretConfigured: !!stripeSecretKey,
      stripeSecretPrefix: stripeSecretKey?.substring(0, 10),
      nodeEnv: process.env.NODE_ENV,
      nextPublicUrl: process.env.NEXT_PUBLIC_URL
    });

  } catch (error) {
    console.error('Debug webhook config error:', error);
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    );
  }
}