'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  User,
  SignupData,
  LoginData,
  AuthResponse,
  UserPreferences,
  SUBSCRIPTION_PLANS,
  FREE_PLAN
} from '@/types/subscription';

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: Omit<User, 'passwordHash'> }
  | { type: 'SIGNUP_SUCCESS'; payload: Omit<User, 'passwordHash'> }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<Omit<User, 'passwordHash'>> };

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOGIN_SUCCESS':
    case 'SIGNUP_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case 'LOGOUT':
      return {
        ...initialState
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };

    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (loginData: LoginData) => Promise<void>;
  signup: (signupData: SignupData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user creation function
const createDemoUser = (signupData: SignupData): Omit<User, 'passwordHash'> => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const userId = 'user-' + Date.now();
  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === signupData.selectedPlan) || FREE_PLAN;

  const defaultPreferences: UserPreferences = {
    defaultLocation: 'United Kingdom',
    preferredJobTypes: [],
    defaultProviders: ['Reed', 'Adzuna', 'JSearch'],
    emailNotifications: true,
    marketingEmails: false,
    ...signupData.preferences
  };

  return {
    id: userId,
    email: signupData.email,
    name: signupData.name,
    role: signupData.email === 'admin@resumed.com' ? 'admin' : 'user',
    emailVerified: false,
    subscription: {
      id: 'sub-' + userId,
      userId,
      planId: selectedPlan.id,
      tier: selectedPlan.tier,
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
    preferences: defaultPreferences,
    createdAt: new Date().toISOString()
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('resumed_auth_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('resumed_auth_user');
      }
    }
  }, []);

  // Save user to localStorage whenever auth state changes
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('resumed_auth_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('resumed_auth_user');
    }
  }, [state.user]);

  const login = async (loginData: LoginData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // In a real app, this would make an API call
      // For demo, check against admin credentials or create demo user
      if (loginData.email === 'admin@resumed.com' && loginData.password === 'admin123') {
        const adminUser = createDemoUser({
          name: 'Admin User',
          email: 'admin@resumed.com',
          password: 'admin123',
          selectedPlan: 'professional'
        });
        dispatch({ type: 'LOGIN_SUCCESS', payload: adminUser });
      } else {
        // Create demo user for any other credentials
        const demoUser = createDemoUser({
          name: loginData.email.split('@')[0],
          email: loginData.email,
          password: loginData.password,
          selectedPlan: 'free'
        });
        dispatch({ type: 'LOGIN_SUCCESS', payload: demoUser });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
    }
  };

  const signup = async (signupData: SignupData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // In a real app, this would make an API call
      const newUser = createDemoUser(signupData);
      dispatch({ type: 'SIGNUP_SUCCESS', payload: newUser });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Signup failed' });
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  const value: AuthContextType = {
    state,
    login,
    signup,
    logout,
    clearError,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}