import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe configuration
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890abcdef...'; // Replace with your publishable key
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51234567890abcdef...'; // Replace with your secret key

// Stripe price IDs (you'll get these from your Stripe dashboard)
export const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_1234567890abcdef', // £7.99/month
  professional: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || 'price_0987654321fedcba' // £15.99/month
};

// Initialize Stripe client-side
let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Stripe product configuration that matches your plans
export const STRIPE_PRODUCTS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: null,
    features: [
      'Basic resume builder',
      '5 job searches per month',
      '1 AI optimization per month',
      '1 cover letter per month',
      '1 profile export per month'
    ],
    limits: {
      jobSearchesPerMonth: 5,
      aiOptimizations: 1,
      coverLetters: 1,
      profileExports: 1
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 7.99,
    stripePriceId: STRIPE_PRICE_IDS.pro,
    popular: true,
    features: [
      'Advanced resume builder',
      'Unlimited job searches',
      '10 AI optimizations per month',
      '15 cover letters per month',
      '20 profile exports per month',
      'Priority support'
    ],
    limits: {
      jobSearchesPerMonth: -1,
      aiOptimizations: 10,
      coverLetters: 15,
      profileExports: 20
    }
  },
  professional: {
    id: 'professional',
    name: 'Ultimate',
    price: 15.99,
    stripePriceId: STRIPE_PRICE_IDS.professional,
    features: [
      'Everything in Pro',
      'Unlimited AI optimizations',
      'Unlimited cover letters',
      'Unlimited profile exports',
      'Premium templates',
      'Dedicated support'
    ],
    limits: {
      jobSearchesPerMonth: -1,
      aiOptimizations: -1,
      coverLetters: -1,
      profileExports: -1
    }
  }
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;