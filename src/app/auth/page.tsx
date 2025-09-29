'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

function AuthSearchParamsHandler({ setIsSignup }: { setIsSignup: (value: boolean) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignup(true);
    }
  }, [searchParams, setIsSignup]);

  return null;
}

function AuthPageContent() {
  const { state, login, signup, clearError } = useAuth();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    selectedPlan: 'free'
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(loginForm);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signup(signupForm);
  };

  // Redirect on successful authentication
  useEffect(() => {
    if (state.isAuthenticated && state.user && !state.isLoading) {
      // Redirect admins to admin dashboard, regular users to profile
      router.push(state.user.isAdmin ? '/admin' : '/profile');
    }
  }, [state.isAuthenticated, state.user, state.isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthSearchParamsHandler setIsSignup={setIsSignup} />
      </Suspense>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                ResuMed
              </h1>
              <p className="text-sm text-teal-600 font-medium">Clinical Resume Care</p>
            </div>
          </Link>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-xl shadow-lg border border-teal-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={() => setIsSignup(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  !isSignup
                    ? 'bg-white text-teal-700 shadow-sm border border-teal-200'
                    : 'text-gray-600 hover:text-teal-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsSignup(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isSignup
                    ? 'bg-white text-teal-700 shadow-sm border border-teal-200'
                    : 'text-gray-600 hover:text-teal-600'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <div className="p-6">
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{state.error}</p>
              </div>
            )}

            {isSignup ? (
              /* Signup Form */
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={signupForm.name}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Choose a secure password"
                  />
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Password must contain:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                      <li>One special character</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Your Plan
                  </label>
                  <div className="space-y-3">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <div key={plan.id} className="relative">
                        <input
                          type="radio"
                          id={`plan-${plan.id}`}
                          name="selectedPlan"
                          value={plan.id}
                          checked={signupForm.selectedPlan === plan.id}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, selectedPlan: e.target.value }))}
                          className="sr-only"
                        />
                        <label
                          htmlFor={`plan-${plan.id}`}
                          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            signupForm.selectedPlan === plan.id
                              ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                              : 'border-gray-200 hover:border-teal-300 bg-white'
                          } ${plan.popular ? 'ring-2 ring-blue-200 border-blue-400' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                {plan.popular && (
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    Most Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-2xl font-bold text-gray-900 mt-1">
                                {plan.price === 0 ? 'Free' : `£${plan.price}/month`}
                              </p>
                              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                                {plan.features.slice(0, 3).map((feature, index) => (
                                  <li key={index} className="flex items-center">
                                    <svg className="w-4 h-4 text-teal-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {feature}
                                  </li>
                                ))}
                                {plan.features.length > 3 && (
                                  <li className="text-xs text-gray-500">
                                    +{plan.features.length - 3} more features
                                  </li>
                                )}
                              </ul>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              signupForm.selectedPlan === plan.id
                                ? 'border-teal-500 bg-teal-500'
                                : 'border-gray-300'
                            }`}>
                              {signupForm.selectedPlan === plan.id && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {state.isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            ) : (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {state.isLoading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="text-center mt-4">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors duration-200"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <AuthPageContent />;
}