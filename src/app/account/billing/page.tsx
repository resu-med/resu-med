'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import RouteGuard from '@/components/RouteGuard';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import { getStripe } from '@/lib/stripe';

function BillingPageContent() {
  const searchParams = useSearchParams();
  const { state: authState } = useAuth();
  const { getCurrentPlan, state: subState, upgradeToPlan } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [showMessage, setShowMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setShowMessage({
        type: 'success',
        message: 'Payment successful! Your subscription has been updated.'
      });
      setTimeout(() => setShowMessage(null), 5000);
    } else if (canceled === 'true') {
      setShowMessage({
        type: 'error',
        message: 'Payment was canceled. You can try again anytime.'
      });
      setTimeout(() => setShowMessage(null), 5000);
    }
  }, [searchParams]);

  const currentPlan = getCurrentPlan();

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        'Basic resume builder',
        '5 job searches per month',
        '1 AI optimization per month',
        '2 cover letters per month',
        '3 profile exports per month'
      ],
      limits: {
        jobSearchesPerMonth: 5,
        aiOptimizations: 1,
        coverLetters: 2,
        profileExports: 3
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 7.99,
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
    {
      id: 'professional',
      name: 'Ultimate',
      price: 15.99,
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
  ];

  const handleUpgrade = async (planId: string) => {
    if (!authState.user) return;

    setIsUpgrading(true);
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: authState.user.id,
          userEmail: authState.user.email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSubscriptionManagement = async (action: 'cancel' | 'resume') => {
    if (!authState.user || !subState.user?.subscription?.stripeSubscriptionId) return;

    setIsManaging(true);
    try {
      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          subscriptionId: subState.user.subscription.stripeSubscriptionId,
          userId: authState.user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowMessage({
          type: 'success',
          message: action === 'cancel'
            ? 'Subscription will be canceled at the end of your billing period.'
            : 'Subscription has been resumed successfully.'
        });
        // You might want to refresh the subscription state here
      } else {
        throw new Error(data.error || `Failed to ${action} subscription`);
      }
    } catch (error) {
      console.error('Subscription management error:', error);
      setShowMessage({
        type: 'error',
        message: `Failed to ${action} subscription. Please try again.`
      });
    } finally {
      setIsManaging(false);
      setTimeout(() => setShowMessage(null), 5000);
    }
  };

  const mockInvoices = [
    {
      id: 'inv_001',
      date: '2024-01-15',
      amount: 7.99,
      status: 'paid',
      plan: 'Pro',
      period: 'Jan 2024'
    },
    {
      id: 'inv_002',
      date: '2023-12-15',
      amount: 7.99,
      status: 'paid',
      plan: 'Pro',
      period: 'Dec 2023'
    },
    {
      id: 'inv_003',
      date: '2023-11-15',
      amount: 7.99,
      status: 'paid',
      plan: 'Pro',
      period: 'Nov 2023'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50">
        <ResponsiveNavigation />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {showMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            showMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {showMessage.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{showMessage.message}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setShowMessage(null)}
                  className="inline-flex text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/profile" className="hover:text-teal-600">Account</Link>
            <span>/</span>
            <span className="text-gray-900">Billing & Payments</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                Billing & Payments
              </h1>
              <p className="text-teal-600 font-medium">Manage your subscription and billing details</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h3>
                    <p className="text-gray-600">
                      {currentPlan.price === 0 ? 'Free forever' : `£${currentPlan.price}/month`}
                    </p>
                    {subState.user?.subscription && (
                      <p className="text-sm text-gray-500 mt-2">
                        {currentPlan.id === 'free' ? 'No billing cycle' :
                         `Next billing: ${new Date(subState.user.subscription.currentPeriodEnd).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      currentPlan.id === 'free' ? 'bg-gray-100 text-gray-800' :
                      currentPlan.id === 'pro' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {subState.user?.subscription?.cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                    </div>

                    {/* Cancel/Resume buttons for paid plans */}
                    {currentPlan.id !== 'free' && subState.user?.subscription && (
                      <div className="flex space-x-2">
                        {subState.user.subscription.cancelAtPeriodEnd ? (
                          <button
                            onClick={() => handleSubscriptionManagement('resume')}
                            disabled={isManaging}
                            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isManaging ? 'Processing...' : 'Resume'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscriptionManagement('cancel')}
                            disabled={isManaging}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isManaging ? 'Processing...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Usage Progress Bars */}
                {subState.user?.usage && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Usage This Month</h4>
                    {[
                      { label: 'Job Searches', used: subState.user.usage.jobSearches, limit: currentPlan.limits.jobSearchesPerMonth },
                      { label: 'AI Optimizations', used: subState.user.usage.aiOptimizations, limit: currentPlan.limits.aiOptimizations },
                      { label: 'Cover Letters', used: subState.user.usage.coverLettersGenerated, limit: currentPlan.limits.coverLetters },
                      { label: 'Profile Exports', used: subState.user.usage.profileExports, limit: currentPlan.limits.profileExports }
                    ].map((item) => {
                      const percentage = item.limit === -1 ? 0 : Math.min(100, (item.used / item.limit) * 100);
                      const isUnlimited = item.limit === -1;
                      return (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-medium">
                              {item.used}{isUnlimited ? ' (Unlimited)' : ` / ${item.limit}`}
                            </span>
                          </div>
                          {!isUnlimited && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  percentage >= 90 ? 'bg-red-500' :
                                  percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Available Plans */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-gray-900">Available Plans</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-lg border-2 p-6 ${
                        currentPlan.id === plan.id
                          ? 'border-teal-500 bg-teal-50'
                          : plan.popular
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {plan.popular && currentPlan.id !== plan.id && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                            Popular
                          </span>
                        </div>
                      )}
                      {currentPlan.id === plan.id && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-teal-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                            Current Plan
                          </span>
                        </div>
                      )}

                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        <div className="mt-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {plan.price === 0 ? 'Free' : `£${plan.price}`}
                          </span>
                          {plan.price > 0 && <span className="text-gray-500">/month</span>}
                        </div>
                      </div>

                      <ul className="mt-6 space-y-3">
                        {plan.features.slice(0, 4).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-6">
                        {currentPlan.id === plan.id ? (
                          <button className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed">
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={isUpgrading}
                            className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            {isUpgrading ? 'Processing...' :
                             plan.price === 0 ? 'Downgrade' :
                             plan.price < (plans.find(p => p.id === currentPlan.id)?.price || 0) ? 'Downgrade' : 'Upgrade'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                {currentPlan.id === 'free' ? (
                  <p className="text-gray-600 text-sm">No payment method required for free plan.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="w-8 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">••••</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
                        <p className="text-xs text-gray-500">Expires 12/27</p>
                      </div>
                    </div>
                    <button className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium">
                      Update Payment Method
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
                {currentPlan.id === 'free' ? (
                  <p className="text-gray-600 text-sm">No billing history for free plan.</p>
                ) : (
                  <div className="space-y-3">
                    {mockInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.period}</p>
                          <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">£{invoice.amount}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium mt-4">
                      View All Invoices
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <RouteGuard requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
        </div>
      }>
        <BillingPageContent />
      </Suspense>
    </RouteGuard>
  );
}