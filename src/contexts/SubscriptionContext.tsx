'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  User,
  UserSubscription,
  UsageTracking,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  FREE_PLAN
} from '@/types/subscription';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  user: Omit<User, 'passwordHash'> | null;
  isLoading: boolean;
  error: string | null;
}

type SubscriptionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: Omit<User, 'passwordHash'> }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_USAGE'; payload: Partial<UsageTracking> }
  | { type: 'UPGRADE_SUBSCRIPTION'; payload: UserSubscription }
  | { type: 'RESET_USAGE' }
  | { type: 'LOGOUT' };

const initialState: SubscriptionState = {
  user: null,
  isLoading: false,
  error: null
};

// Create default free user for demo purposes
const createDefaultUser = (): User => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const userId = 'demo-user-' + Date.now();

  return {
    id: userId,
    email: 'demo@resumed.com',
    name: 'Demo User',
    subscription: {
      id: 'sub-' + userId,
      userId,
      planId: 'free',
      tier: 'free',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    usage: {
      userId,
      month: currentMonth,
      jobSearches: 0,
      aiOptimizations: 0,
      coverLettersGenerated: 0,
      profileExports: 0,
      lastResetDate: new Date().toISOString()
    },
    createdAt: new Date().toISOString()
  };
};

function subscriptionReducer(state: SubscriptionState, action: SubscriptionAction): SubscriptionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false, error: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'UPDATE_USAGE':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          usage: { ...state.user.usage, ...action.payload }
        }
      };

    case 'UPGRADE_SUBSCRIPTION':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          subscription: action.payload
        }
      };

    case 'RESET_USAGE':
      if (!state.user) return state;
      const currentMonth = new Date().toISOString().slice(0, 7);
      return {
        ...state,
        user: {
          ...state.user,
          usage: {
            ...state.user.usage,
            month: currentMonth,
            jobSearches: 0,
            aiOptimizations: 0,
            coverLettersGenerated: 0,
            profileExports: 0,
            lastResetDate: new Date().toISOString()
          }
        }
      };

    case 'LOGOUT':
      return { ...initialState };

    default:
      return state;
  }
}

interface SubscriptionContextType {
  state: SubscriptionState;
  // User management
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;

  // Usage tracking
  canPerformAction: (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export') => boolean;
  incrementUsage: (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export') => void;
  getRemainingUsage: (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export') => number;

  // Subscription management
  getCurrentPlan: () => typeof FREE_PLAN;
  upgradeToPlan: (planId: string) => Promise<void>;

  // Utilities
  isFeatureAvailable: (feature: string) => boolean;
  getUsagePercentage: (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export') => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const { state: authState } = useAuth();

  // Sync with authenticated user and fetch subscription data
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && authState.token) {
      const fetchUserSubscription = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          // Fetch actual subscription data from database
          const response = await fetch(`/api/debug/check-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authState.token}`
            },
            body: JSON.stringify({ email: authState.user.email })
          });

          if (response.ok) {
            const data = await response.json();
            const userData = data.user;

            const currentMonth = new Date().toISOString().slice(0, 7);
            const userWithSubscription = {
              id: authState.user.id.toString(),
              email: authState.user.email,
              name: authState.user.name,
              subscription: {
                id: userData.stripe_subscription_id || 'sub-' + authState.user.id,
                userId: authState.user.id.toString(),
                planId: userData.plan_id || 'free',
                tier: userData.tier || 'free' as SubscriptionTier,
                status: userData.status || 'active',
                currentPeriodStart: new Date().toISOString(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                cancelAtPeriodEnd: false,
                createdAt: authState.user.createdAt,
                updatedAt: new Date().toISOString()
              },
              usage: {
                userId: authState.user.id.toString(),
                month: currentMonth,
                jobSearches: 0,
                aiOptimizations: 0,
                coverLettersGenerated: 0,
                profileExports: 0,
                lastResetDate: new Date().toISOString()
              },
              createdAt: authState.user.createdAt
            };
            dispatch({ type: 'SET_USER', payload: userWithSubscription });
          } else {
            // Fallback to free plan if fetch fails
            console.error('Failed to fetch subscription data, defaulting to free plan');
            const currentMonth = new Date().toISOString().slice(0, 7);
            const userWithSubscription = {
              id: authState.user.id.toString(),
              email: authState.user.email,
              name: authState.user.name,
              subscription: {
                id: 'sub-' + authState.user.id,
                userId: authState.user.id.toString(),
                planId: 'free',
                tier: 'free' as SubscriptionTier,
                status: 'active',
                currentPeriodStart: new Date().toISOString(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                cancelAtPeriodEnd: false,
                createdAt: authState.user.createdAt,
                updatedAt: new Date().toISOString()
              },
              usage: {
                userId: authState.user.id.toString(),
                month: currentMonth,
                jobSearches: 0,
                aiOptimizations: 0,
                coverLettersGenerated: 0,
                profileExports: 0,
                lastResetDate: new Date().toISOString()
              },
              createdAt: authState.user.createdAt
            };
            dispatch({ type: 'SET_USER', payload: userWithSubscription });
          }
        } catch (error) {
          console.error('Error fetching subscription data:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load subscription data' });
        }
      };

      fetchUserSubscription();
    } else {
      dispatch({ type: 'LOGOUT' });
    }
  }, [authState.isAuthenticated, authState.user, authState.token]);

  const initializeDemoUser = () => {
    const demoUser = createDefaultUser();
    dispatch({ type: 'SET_USER', payload: demoUser });
  };

  const loginUser = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // In a real app, this would make an API call
      // For now, just create a demo user
      const user = createDefaultUser();
      user.email = email;
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('resumed_user');
    dispatch({ type: 'LOGOUT' });
  };

  const getCurrentPlan = () => {
    if (!state.user) return FREE_PLAN;
    return SUBSCRIPTION_PLANS.find(p => p.id === state.user.subscription.planId) || FREE_PLAN;
  };

  const canPerformAction = (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export'): boolean => {
    if (!state.user) return false;

    const plan = getCurrentPlan();
    const usage = state.user.usage;

    switch (action) {
      case 'job-search':
        return plan.limits.jobSearchesPerMonth === -1 || usage.jobSearches < plan.limits.jobSearchesPerMonth;
      case 'ai-optimization':
        return plan.limits.aiOptimizations === -1 || usage.aiOptimizations < plan.limits.aiOptimizations;
      case 'cover-letter':
        return plan.limits.coverLetters === -1 || usage.coverLettersGenerated < plan.limits.coverLetters;
      case 'export':
        return plan.limits.profileExports === -1 || usage.profileExports < plan.limits.profileExports;
      default:
        return false;
    }
  };

  const incrementUsage = (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export') => {
    if (!state.user || !canPerformAction(action)) return;

    const updates: Partial<UsageTracking> = {};

    switch (action) {
      case 'job-search':
        updates.jobSearches = state.user.usage.jobSearches + 1;
        updates.lastJobSearch = new Date().toISOString();
        break;
      case 'ai-optimization':
        updates.aiOptimizations = state.user.usage.aiOptimizations + 1;
        break;
      case 'cover-letter':
        updates.coverLettersGenerated = state.user.usage.coverLettersGenerated + 1;
        break;
      case 'export':
        updates.profileExports = state.user.usage.profileExports + 1;
        break;
    }

    dispatch({ type: 'UPDATE_USAGE', payload: updates });
  };

  const getRemainingUsage = (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export'): number => {
    if (!state.user) return 0;

    const plan = getCurrentPlan();
    const usage = state.user.usage;

    switch (action) {
      case 'job-search':
        return plan.limits.jobSearchesPerMonth === -1 ? -1 : Math.max(0, plan.limits.jobSearchesPerMonth - usage.jobSearches);
      case 'ai-optimization':
        return plan.limits.aiOptimizations === -1 ? -1 : Math.max(0, plan.limits.aiOptimizations - usage.aiOptimizations);
      case 'cover-letter':
        return plan.limits.coverLetters === -1 ? -1 : Math.max(0, plan.limits.coverLetters - usage.coverLettersGenerated);
      case 'export':
        return plan.limits.profileExports === -1 ? -1 : Math.max(0, plan.limits.profileExports - usage.profileExports);
      default:
        return 0;
    }
  };

  const getUsagePercentage = (action: 'job-search' | 'ai-optimization' | 'cover-letter' | 'export'): number => {
    if (!state.user) return 0;

    const plan = getCurrentPlan();
    const usage = state.user.usage;

    let used = 0;
    let limit = 0;

    switch (action) {
      case 'job-search':
        used = usage.jobSearches;
        limit = plan.limits.jobSearchesPerMonth;
        break;
      case 'ai-optimization':
        used = usage.aiOptimizations;
        limit = plan.limits.aiOptimizations;
        break;
      case 'cover-letter':
        used = usage.coverLettersGenerated;
        limit = plan.limits.coverLetters;
        break;
      case 'export':
        used = usage.profileExports;
        limit = plan.limits.profileExports;
        break;
    }

    if (limit === -1) return 0; // Unlimited
    return Math.min(100, (used / limit) * 100);
  };

  const upgradeToPlan = async (planId: string) => {
    if (!state.user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // In a real app, this would integrate with Stripe
      const newSubscription: UserSubscription = {
        ...state.user.subscription,
        planId,
        tier: planId as SubscriptionTier,
        updatedAt: new Date().toISOString()
      };

      dispatch({ type: 'UPGRADE_SUBSCRIPTION', payload: newSubscription });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Upgrade failed' });
    }
  };

  const isFeatureAvailable = (feature: string): boolean => {
    const plan = getCurrentPlan();
    return plan.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  };

  const value: SubscriptionContextType = {
    state,
    loginUser,
    logoutUser,
    canPerformAction,
    incrementUsage,
    getRemainingUsage,
    getCurrentPlan,
    upgradeToPlan,
    isFeatureAvailable,
    getUsagePercentage
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}