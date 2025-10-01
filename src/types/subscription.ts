// Subscription and monetization types

export type SubscriptionTier = 'free' | 'pro' | 'professional';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number; // Monthly price in GBP
  yearlyPrice?: number; // Yearly price in GBP (with discount)
  features: string[];
  limits: {
    jobSearchesPerMonth: number;
    resumeTemplates: number;
    aiOptimizations: number;
    coverLetters: number;
    profileExports: number;
  };
  popular?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageTracking {
  userId: string;
  month: string; // YYYY-MM format
  jobSearches: number;
  aiOptimizations: number;
  coverLettersGenerated: number;
  profileExports: number;
  lastJobSearch?: string;
  lastResetDate: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  passwordHash?: string; // Only for backend, never sent to frontend
  role: 'user' | 'admin';
  emailVerified: boolean;
  subscription: UserSubscription;
  usage: UsageTracking;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  defaultLocation?: string;
  preferredJobTypes: string[];
  defaultProviders: string[];
  emailNotifications: boolean;
  marketingEmails: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string; // 'gbp'
  status: string;
  planId: string;
  userId: string;
}

// Authentication types
export interface SignupData {
  name: string;
  email: string;
  password: string;
  selectedPlan: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
  error?: string;
}

// Plan configurations
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    price: 0,
    features: [
      'Basic resume builder',
      '5 job searches per month',
      '1 basic template',
      '1 AI optimization',
      '1 cover letter',
      '1 PDF export'
    ],
    limits: {
      jobSearchesPerMonth: 5,
      resumeTemplates: 1,
      aiOptimizations: 1,
      coverLetters: 1,
      profileExports: 1
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    price: 7.99,
    yearlyPrice: 79.99, // 2 months free
    features: [
      'Advanced resume builder',
      'Unlimited job searches',
      '10+ premium templates',
      'AI resume optimization',
      '5 cover letters per month',
      'Multiple export formats',
      'Priority support'
    ],
    limits: {
      jobSearchesPerMonth: -1, // unlimited
      resumeTemplates: 10,
      aiOptimizations: 3,
      coverLetters: 5,
      profileExports: -1 // unlimited
    },
    popular: true
  },
  {
    id: 'professional',
    name: 'Professional',
    tier: 'professional',
    price: 15.99,
    yearlyPrice: 159.99, // 2 months free
    features: [
      'Everything in Pro',
      'Unlimited AI optimizations',
      'Unlimited cover letters',
      'Application tracking',
      'Interview preparation',
      'Salary insights',
      'Personal career advisor',
      'White-glove support'
    ],
    limits: {
      jobSearchesPerMonth: -1, // unlimited
      resumeTemplates: -1, // unlimited
      aiOptimizations: -1, // unlimited
      coverLetters: -1, // unlimited
      profileExports: -1 // unlimited
    }
  }
];

export const FREE_PLAN = SUBSCRIPTION_PLANS.find(p => p.id === 'free')!;
export const PRO_PLAN = SUBSCRIPTION_PLANS.find(p => p.id === 'pro')!;
export const PROFESSIONAL_PLAN = SUBSCRIPTION_PLANS.find(p => p.id === 'professional')!;