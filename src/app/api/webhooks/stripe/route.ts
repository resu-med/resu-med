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

    console.log('🔍 Webhook signature check:', signature ? 'Present' : 'Missing');
    console.log('🔍 Webhook secret configured:', webhookSecret ? 'Yes' : 'No');
    console.log('🔍 Body type:', typeof body, 'Length:', body.length);

    if (!signature) {
      console.error('❌ No Stripe signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified successfully');
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      console.error('❌ Error type:', err.constructor.name);
      console.error('❌ Webhook secret being used:', webhookSecret?.substring(0, 10) + '...');
      console.error('❌ Raw signature header:', signature);

      // For debugging purposes, let's try to parse the event without verification in non-production
      if (process.env.NODE_ENV !== 'production') {
        try {
          const unsafeEvent = JSON.parse(body);
          console.log('🔧 DEBUG: Parsed event without verification:', unsafeEvent.type, unsafeEvent.id);
        } catch (parseErr) {
          console.error('❌ Failed to parse body as JSON:', parseErr);
        }
      }

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('🔔 Stripe webhook event:', event.type, 'ID:', event.id);
    console.log('📊 Event data preview:', JSON.stringify(event.data.object, null, 2).substring(0, 500) + '...');

    // Check database connection
    if (!sql) {
      console.error('❌ Database not available in webhook');
      return NextResponse.json(
        { error: 'Database not available', timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    console.log('✅ Database connection available');

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
    console.error('❌ Webhook error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Returning error response:', errorMessage);

    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  console.log('🔍 Session metadata:', JSON.stringify(session.metadata, null, 2));
  console.log('🔍 Session customer:', session.customer);
  console.log('🔍 Session subscription:', session.subscription);

  const { userId, planId } = session.metadata || {};

  console.log('🔍 Extracted userId:', userId, 'planId:', planId);

  if (!userId || !planId) {
    console.error('❌ Missing metadata in checkout session');
    console.error('❌ Available metadata keys:', Object.keys(session.metadata || {}));
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
  console.log('Subscription created:', subscription.id, 'status:', subscription.status);
  console.log('🔍 Subscription metadata:', JSON.stringify(subscription.metadata, null, 2));

  const { userId, planId } = subscription.metadata || {};

  console.log('🔍 Extracted userId:', userId, 'planId:', planId);

  if (!userId || !planId) {
    console.error('❌ Missing metadata in subscription');
    console.error('❌ Available metadata keys:', Object.keys(subscription.metadata || {}));
    return;
  }

  // Only update to paid plan if subscription is active
  if (subscription.status === 'active') {
    try {
      // Update user subscription in database
      await updateUserSubscription(parseInt(userId), {
        planId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });

      console.log(`✅ Subscription ${subscription.id} activated for user ${userId}`);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  } else {
    console.log(`⏳ Subscription ${subscription.id} created but not active (${subscription.status})`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id, 'status:', subscription.status);
  console.log('🔍 Subscription metadata:', JSON.stringify(subscription.metadata, null, 2));

  const { userId, planId } = subscription.metadata || {};

  console.log('🔍 Extracted userId:', userId, 'planId:', planId);

  if (!userId) {
    console.error('❌ Missing userId in subscription metadata');
    console.error('❌ Available metadata keys:', Object.keys(subscription.metadata || {}));
    return;
  }

  try {
    // If subscription becomes active, activate the paid plan
    if (subscription.status === 'active' && planId && planId !== 'free') {
      console.log(`🚀 Activating ${planId} plan for user ${userId}...`);
      await updateUserSubscription(parseInt(userId), {
        planId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      console.log(`✅ User ${userId} upgraded to ${planId} plan via subscription update`);
    } else {
      // Just update status and dates for other changes
      await updateUserSubscription(parseInt(userId), {
        status: subscription.status as 'active' | 'cancelled' | 'expired' | 'trialing' | 'incomplete',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      console.log(`✅ Subscription ${subscription.id} status updated for user ${userId}`);
    }
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

      // If this is the first payment (subscription creation), activate the subscription
      if (invoice.billing_reason === 'subscription_create') {
        console.log('💰 First payment detected - activating subscription');
        // Get subscription details to extract metadata
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const { userId, planId } = subscription.metadata || {};

        console.log('👤 Metadata from subscription:', { userId, planId });

        if (userId && planId) {
          console.log(`🔄 Updating user ${userId} to ${planId} plan...`);
          await updateUserSubscription(parseInt(userId), {
            planId,
            stripeSubscriptionId: subscription.id,
            status: 'active',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });

          console.log(`✅ Subscription ${subscription.id} activated for user ${userId} via payment success`);
        } else {
          console.error('❌ Missing userId or planId in subscription metadata');
        }
      }
    } catch (error) {
      console.error('Failed to record payment or activate subscription:', error);
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

  console.log('🔍 Updating subscription for userId:', userId);
  console.log('🔍 Updates:', JSON.stringify(updates, null, 2));

  try {
    // Check if user has a subscription record
    const existingSubscription = await sql`
      SELECT id FROM user_subscriptions WHERE user_id = ${userId}
    `;

    console.log('🔍 Existing subscription found:', existingSubscription.length > 0);

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