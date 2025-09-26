'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SignupData, LoginData, SUBSCRIPTION_PLANS } from '@/types/subscription';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

  const [signupForm, setSignupForm] = useState<SignupData>({
    name: '',
    email: '',
    password: '',
    selectedPlan: 'free',
    preferences: {
      defaultLocation: 'United Kingdom',
      preferredJobTypes: [],
      defaultProviders: ['Reed', 'Adzuna', 'JSearch'],
      emailNotifications: true,
      marketingEmails: false
    }
  });

  const [loginForm, setLoginForm] = useState<LoginData>({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(loginForm);
    if (!state.error) {
      router.push('/job-search');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signup(signupForm);
    if (!state.error) {
      router.push('/job-search');
    }
  };

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
                </div>

                {/* Subscription Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Your Plan
                  </label>
                  <div className="space-y-3">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <label
                        key={plan.id}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                          signupForm.selectedPlan === plan.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={signupForm.selectedPlan === plan.id}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, selectedPlan: e.target.value }))}
                          className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{plan.name}</span>
                            {plan.popular && (
                              <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.price === 0 ? 'Free' : `£${plan.price}/month`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {plan.features.slice(0, 2).join(' • ')}
                          </p>
                        </div>
                      </label>
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