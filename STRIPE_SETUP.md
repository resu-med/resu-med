# Stripe Payment Integration Setup

Your payment system is now ready for configuration. Follow these steps to set up Stripe:

## 1. Create Stripe Account
1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create your account and verify your email
3. Complete your business information

## 2. Get Your API Keys
1. In your Stripe dashboard, go to "Developers" → "API keys"
2. Copy your **Publishable key** (starts with `pk_test_` for test mode)
3. Copy your **Secret key** (starts with `sk_test_` for test mode)

## 3. Create Products and Prices
1. Go to "Products" in your Stripe dashboard
2. Create two products:

### Pro Plan (£7.99/month)
- Name: "Pro Plan"
- Description: "Advanced resume builder with unlimited job searches"
- Pricing: £7.99 monthly recurring

### Ultimate Plan (£15.99/month)
- Name: "Ultimate Plan"
- Description: "Everything in Pro plus unlimited AI optimizations"
- Pricing: £15.99 monthly recurring

3. Copy the Price IDs (they start with `price_`) for each plan

## 4. Set Up Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your real Stripe values:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here
   NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID=price_your_professional_price_id_here
   NEXT_PUBLIC_URL=http://localhost:3000
   ```

## 5. Set Up Webhooks
1. In Stripe dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Set endpoint URL to: `http://localhost:3000/api/webhooks/stripe`
   (For production, use your domain: `https://yourdomain.com/api/webhooks/stripe`)
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add it to your `.env.local` file

## 6. Test the Integration
1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Go to `/account/billing`
3. Click "Upgrade to Pro"
4. Use Stripe's test card: `4242 4242 4242 4242`
5. Use any future expiry date and any 3-digit CVC

## 7. For Production
1. Switch to live mode in Stripe dashboard
2. Get your live API keys (they start with `pk_live_` and `sk_live_`)
3. Update your environment variables
4. Set up webhook endpoint with your production domain

## Current Implementation Status
✅ Stripe configuration and product setup
✅ Checkout API endpoint for creating payment sessions
✅ Webhook handler for subscription events
✅ Billing page with real Stripe integration
✅ Environment variable template

## Next Steps
- Complete webhook integration with user database updates
- Implement subscription management (cancel/resume)
- Add usage tracking and limits enforcement