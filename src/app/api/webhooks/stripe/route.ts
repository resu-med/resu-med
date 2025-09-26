import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '@/lib/stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_1234567890abcdef...';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);

  const { userId, planId } = session.metadata || {};

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // TODO: Update user subscription in your database
  // Example:
  // await updateUserSubscription(userId, {
  //   planId,
  //   stripeCustomerId: session.customer as string,
  //   stripeSubscriptionId: session.subscription as string,
  //   status: 'active',
  //   currentPeriodStart: new Date(),
  //   currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  // });

  console.log(`User ${userId} subscribed to ${planId} plan`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const { userId, planId } = subscription.metadata || {};

  if (!userId || !planId) {
    console.error('Missing metadata in subscription');
    return;
  }

  // TODO: Update user subscription in your database
  // Example:
  // await updateUserSubscription(userId, {
  //   stripeSubscriptionId: subscription.id,
  //   status: subscription.status,
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const { userId } = subscription.metadata || {};

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // TODO: Update subscription status in your database
  // Example:
  // await updateUserSubscription(userId, {
  //   status: subscription.status,
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //   cancelAtPeriodEnd: subscription.cancel_at_period_end,
  // });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Subscription canceled:', subscription.id);

  const { userId } = subscription.metadata || {};

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // TODO: Update user to free plan in your database
  // Example:
  // await updateUserSubscription(userId, {
  //   planId: 'free',
  //   status: 'canceled',
  //   stripeSubscriptionId: null,
  // });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  if (invoice.subscription) {
    // TODO: Record successful payment in your database
    // Example:
    // await recordPayment({
    //   invoiceId: invoice.id,
    //   subscriptionId: invoice.subscription as string,
    //   amount: invoice.amount_paid,
    //   currency: invoice.currency,
    //   status: 'paid',
    // });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);

  if (invoice.subscription) {
    // TODO: Handle failed payment - notify user, update status, etc.
    // Example:
    // await handleFailedPayment({
    //   invoiceId: invoice.id,
    //   subscriptionId: invoice.subscription as string,
    //   amount: invoice.amount_due,
    //   nextPaymentAttempt: invoice.next_payment_attempt,
    // });
  }
}