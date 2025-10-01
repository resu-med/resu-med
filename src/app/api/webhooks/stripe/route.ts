import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '@/lib/stripe';
import { sql } from '@/lib/database';

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

  try {
    // Update user subscription in database
    await updateUserSubscription(parseInt(userId), {
      planId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    console.log(`✅ User ${userId} successfully subscribed to ${planId} plan`);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const { userId, planId } = subscription.metadata || {};

  if (!userId || !planId) {
    console.error('Missing metadata in subscription');
    return;
  }

  try {
    // Update user subscription in database
    await updateUserSubscription(parseInt(userId), {
      planId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status as 'active' | 'cancelled' | 'expired' | 'trialing',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    console.log(`✅ Subscription ${subscription.id} created for user ${userId}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const { userId } = subscription.metadata || {};

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  try {
    // Update subscription status in database
    await updateUserSubscription(parseInt(userId), {
      status: subscription.status as 'active' | 'cancelled' | 'expired' | 'trialing',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    console.log(`✅ Subscription ${subscription.id} updated for user ${userId}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Subscription canceled:', subscription.id);

  const { userId } = subscription.metadata || {};

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  try {
    // Update user to free plan in database
    await updateUserSubscription(parseInt(userId), {
      planId: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
    });

    console.log(`✅ User ${userId} downgraded to free plan due to cancellation`);
  } catch (error) {
    console.error('Failed to downgrade user to free plan:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  if (invoice.subscription) {
    try {
      // Record successful payment in database
      await recordPayment({
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
      });

      console.log(`✅ Payment recorded: ${invoice.id} for ${invoice.currency} ${invoice.amount_paid}`);
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);

  if (invoice.subscription) {
    try {
      // Handle failed payment - record and potentially downgrade user
      await handleFailedPayment({
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        amount: invoice.amount_due,
        nextPaymentAttempt: invoice.next_payment_attempt,
      });

      console.log(`⚠️ Payment failed handled: ${invoice.id}`);
    } catch (error) {
      console.error('Failed to handle payment failure:', error);
    }
  }
}

// Database subscription management functions
interface SubscriptionUpdate {
  planId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  status?: 'active' | 'cancelled' | 'expired' | 'trialing';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

async function updateUserSubscription(userId: number, updates: SubscriptionUpdate): Promise<void> {
  if (!sql) {
    throw new Error('Database not available');
  }

  try {
    // Check if user has a subscription record
    const existingSubscription = await sql`
      SELECT id FROM user_subscriptions WHERE user_id = ${userId}
    `;

    if (existingSubscription.length === 0) {
      // Create new subscription record
      await sql`
        INSERT INTO user_subscriptions (
          user_id, plan_id, tier, status, current_period_start, current_period_end,
          cancel_at_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at
        ) VALUES (
          ${userId},
          ${updates.planId || 'free'},
          ${updates.planId || 'free'},
          ${updates.status || 'active'},
          ${updates.currentPeriodStart || new Date()},
          ${updates.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)},
          ${updates.cancelAtPeriodEnd || false},
          ${updates.stripeCustomerId || null},
          ${updates.stripeSubscriptionId || null},
          NOW(),
          NOW()
        )
      `;
    } else {
      // Update existing subscription
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.planId !== undefined) {
        setParts.push(`plan_id = $${paramIndex++}, tier = $${paramIndex++}`);
        values.push(updates.planId, updates.planId);
      }
      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.currentPeriodStart !== undefined) {
        setParts.push(`current_period_start = $${paramIndex++}`);
        values.push(updates.currentPeriodStart);
      }
      if (updates.currentPeriodEnd !== undefined) {
        setParts.push(`current_period_end = $${paramIndex++}`);
        values.push(updates.currentPeriodEnd);
      }
      if (updates.cancelAtPeriodEnd !== undefined) {
        setParts.push(`cancel_at_period_end = $${paramIndex++}`);
        values.push(updates.cancelAtPeriodEnd);
      }
      if (updates.stripeCustomerId !== undefined) {
        setParts.push(`stripe_customer_id = $${paramIndex++}`);
        values.push(updates.stripeCustomerId);
      }
      if (updates.stripeSubscriptionId !== undefined) {
        setParts.push(`stripe_subscription_id = $${paramIndex++}`);
        values.push(updates.stripeSubscriptionId);
      }

      setParts.push(`updated_at = NOW()`);
      values.push(userId);

      if (setParts.length > 1) { // More than just updated_at
        await sql`
          UPDATE user_subscriptions
          SET ${sql.unsafe(setParts.join(', '))}
          WHERE user_id = $${paramIndex}
        `.apply(sql, values);
      }
    }

    console.log(`✅ Updated subscription for user ${userId}`);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
    throw error;
  }
}

interface PaymentRecord {
  invoiceId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
}

async function recordPayment(payment: PaymentRecord): Promise<void> {
  if (!sql) {
    throw new Error('Database not available');
  }

  try {
    await sql`
      INSERT INTO payment_records (
        invoice_id, subscription_id, amount, currency, status, created_at
      ) VALUES (
        ${payment.invoiceId},
        ${payment.subscriptionId},
        ${payment.amount},
        ${payment.currency},
        ${payment.status},
        NOW()
      )
      ON CONFLICT (invoice_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `;

    console.log(`✅ Payment recorded: ${payment.invoiceId}`);
  } catch (error) {
    console.error('Failed to record payment:', error);
    throw error;
  }
}

interface FailedPayment {
  invoiceId: string;
  subscriptionId: string;
  amount: number;
  nextPaymentAttempt: number | null;
}

async function handleFailedPayment(payment: FailedPayment): Promise<void> {
  if (!sql) {
    throw new Error('Database not available');
  }

  try {
    // Record the failed payment
    await sql`
      INSERT INTO payment_records (
        invoice_id, subscription_id, amount, currency, status, created_at
      ) VALUES (
        ${payment.invoiceId},
        ${payment.subscriptionId},
        ${payment.amount},
        'gbp',
        'failed',
        NOW()
      )
      ON CONFLICT (invoice_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `;

    // If no next payment attempt, downgrade user to free plan
    if (!payment.nextPaymentAttempt) {
      const subscription = await sql`
        SELECT user_id FROM user_subscriptions
        WHERE stripe_subscription_id = ${payment.subscriptionId}
      `;

      if (subscription.length > 0) {
        await updateUserSubscription(subscription[0].user_id, {
          planId: 'free',
          status: 'cancelled',
          stripeSubscriptionId: null,
        });

        console.log(`⚠️ User ${subscription[0].user_id} downgraded to free due to payment failure`);
      }
    }

    console.log(`⚠️ Failed payment handled: ${payment.invoiceId}`);
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
    throw error;
  }
}