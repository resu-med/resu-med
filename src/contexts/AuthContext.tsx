'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  selectedPlan: string;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'SIGNUP_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<AuthUser> };

const initialState: AuthState = {
  user: null,
  token: null,
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
        user: action.payload.user,
        token: action.payload.token,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('resumed_auth_user');
    const savedToken = localStorage.getItem('resumed_auth_token');

    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: savedToken } });
      } catch (error) {
        console.error('Error loading saved auth:', error);
        localStorage.removeItem('resumed_auth_user');
        localStorage.removeItem('resumed_auth_token');
      }
    }
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (state.user && state.token) {
      localStorage.setItem('resumed_auth_user', JSON.stringify(state.user));
      localStorage.setItem('resumed_auth_token', state.token);
    } else {
      localStorage.removeItem('resumed_auth_user');
      localStorage.removeItem('resumed_auth_token');
    }
  }, [state.user, state.token]);

  const login = async (loginData: LoginData) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.token }
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const signup = async (signupData: SignupData) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // First register the user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        if (registerData.details) {
          // Password validation errors
          throw new Error(registerData.details.join('. '));
        }
        throw new Error(registerData.error || 'Registration failed');
      }

      // Then automatically log them in
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error('Registration successful, but auto-login failed. Please log in manually.');
      }

      dispatch({
        type: 'SIGNUP_SUCCESS',
        payload: { user: loginData.user, token: loginData.token }
      });

      // If user selected a paid plan, redirect to Stripe checkout
      if (registerData.selectedPlan && registerData.selectedPlan !== 'free') {
        const checkoutResponse = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
          },
          body: JSON.stringify({
            planId: registerData.selectedPlan,
            userId: loginData.user.id,
            userEmail: loginData.user.email
          }),
        });

        const checkoutData = await checkoutResponse.json();

        if (checkoutResponse.ok && checkoutData.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutData.url;
          return; // Don't continue with normal flow
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };


  const value: AuthContextType = {
    state,
    login,
    signup,
    logout,
    clearError
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