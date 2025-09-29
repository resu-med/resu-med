'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import UserManagementTab from '@/components/admin/UserManagementTab';

interface UserStats {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  verified_users: number;
  admin_users: number;
  active_users_last_30_days: number;
}

interface SubscriptionStats {
  subscription_counts: {
    free: number;
    pro: number;
    professional: number;
  };
  usage_stats: {
    total_job_searches: number;
    total_ai_optimizations: number;
    total_cover_letters: number;
    total_exports: number;
    active_users: number;
  };
}

interface APIStatus {
  name: string;
  used: number;
  limit: number;
  percentage: number;
  cost_per_request: number;
  reset_period: string;
  status: 'safe' | 'warning' | 'danger';
  daily_cost: number;
}

interface APIUsageSummary {
  total_requests_today: number;
  total_cost_today: number;
  apis_at_risk: number;
  apis_warning: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  email_verified: boolean;
  is_admin: boolean;
  is_tester?: boolean;
  last_login_at: string | null;
  created_at: string;
  plan_id?: string;
  tier?: string;
  status?: string;
  job_searches?: number;
  ai_optimizations?: number;
  cover_letters_generated?: number;
  profile_exports?: number;
}

const getSubscriptionLimits = (planId?: string) => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0]; // Default to free
  return plan.limits;
};

const formatUsageWithLimit = (current: number, limit: number) => {
  if (limit === -1) return `${current}/∞`;
  return `${current}/${limit}`;
};

export default function AdminDashboard() {
  const { state } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'api-usage'>('overview');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  const [apiUsage, setApiUsage] = useState<{
    summary: APIUsageSummary;
    api_status: APIStatus[];
  } | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [isTesterOnly, setIsTesterOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin or tester
  useEffect(() => {
    if (!state.isLoading) {
      if (!state.isAuthenticated || (!state.user?.isAdmin && !state.user?.isTester)) {
        router.push('/auth');
        return;
      }
    }
  }, [state.isAuthenticated, state.user?.isAdmin, state.user?.isTester, state.isLoading, router]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!state.token) return;

    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, apiUsageResponse] = await Promise.all([
        fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/admin/api-usage', {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!dashboardResponse.ok || !apiUsageResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [dashboardData, apiUsageData] = await Promise.all([
        dashboardResponse.json(),
        apiUsageResponse.json()
      ]);

      setUserStats(dashboardData.user_stats);
      setSubscriptionStats(dashboardData.subscription_stats);
      setRecentUsers(dashboardData.recent_users || []);
      setIsTesterOnly(dashboardData.is_tester_only || false);
      setApiUsage({
        summary: apiUsageData.summary,
        api_status: apiUsageData.api_status
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state.isAuthenticated && (state.user?.isAdmin || state.user?.isTester) && state.token) {
      fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated, state.user?.isAdmin, state.user?.isTester, state.token]);

  if (state.isLoading || (!state.user?.isAdmin && !state.user?.isTester && state.isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated || (!state.user?.isAdmin && !state.user?.isTester)) {
    return null;
  }

  const getStatusColor = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'danger': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="text-sm text-gray-500">
                Welcome, {state.user.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            {!isTesterOnly && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
            )}
            <button
              onClick={() => setActiveTab('api-usage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api-usage'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              API Usage
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {userStats && (
                <>
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                            <dd className="text-lg font-medium text-gray-900">{userStats.total_users}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">New Today</dt>
                            <dd className="text-lg font-medium text-gray-900">{userStats.new_users_today}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Active (30d)</dt>
                            <dd className="text-lg font-medium text-gray-900">{userStats.active_users_last_30_days}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {apiUsage && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">API Calls Today</dt>
                          <dd className="text-lg font-medium text-gray-900">{apiUsage.summary.total_requests_today}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* API Status Overview */}
            {apiUsage && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">API Usage Status</h3>
                  {apiUsage.summary.apis_at_risk > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ {apiUsage.summary.apis_at_risk} API(s) at risk of hitting limits
                    </p>
                  )}
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apiUsage.api_status.map((api) => (
                      <div key={api.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{api.name}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(api.status)}`}>
                            {api.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Used:</span>
                            <span className="font-medium">{api.used} / {api.limit}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                api.status === 'danger' ? 'bg-red-500' :
                                api.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(api.percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>{api.percentage}% used</span>
                            <span>Resets: {api.reset_period}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Usage Summary */}
            {subscriptionStats && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Subscription Usage This Month</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{subscriptionStats.usage_stats.total_job_searches}</div>
                      <div className="text-sm text-gray-500">Job Searches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{subscriptionStats.usage_stats.total_ai_optimizations}</div>
                      <div className="text-sm text-gray-500">AI Optimizations</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{subscriptionStats.usage_stats.total_cover_letters}</div>
                      <div className="text-sm text-gray-500">Cover Letters</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{subscriptionStats.usage_stats.total_exports}</div>
                      <div className="text-sm text-gray-500">Exports</div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Subscription Distribution</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-lg font-semibold text-gray-600">Free</div>
                        <div className="text-2xl font-bold text-gray-800">{subscriptionStats.subscription_counts.free || 0}</div>
                        <div className="text-sm text-gray-500">users</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-lg font-semibold text-blue-600">Pro</div>
                        <div className="text-2xl font-bold text-blue-800">{subscriptionStats.subscription_counts.pro || 0}</div>
                        <div className="text-sm text-blue-500">users</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-lg font-semibold text-purple-600">Professional</div>
                        <div className="text-2xl font-bold text-purple-800">{subscriptionStats.subscription_counts.professional || 0}</div>
                        <div className="text-sm text-purple-500">users</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Users - Only show for admins */}
            {!isTesterOnly && recentUsers.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Users</h3>
                </div>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage This Month</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.email_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.email_verified ? 'Verified' : 'Unverified'}
                              </span>
                              {user.is_admin && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.plan_id === 'professional' ? 'bg-gold-100 text-gold-800' :
                              user.plan_id === 'pro' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.plan_id === 'professional' ? 'Professional' :
                               user.plan_id === 'pro' ? 'Pro' :
                               'Free'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.job_searches !== null ? (
                              (() => {
                                const limits = getSubscriptionLimits(user.plan_id);
                                return (
                                  <div className="text-xs space-y-1">
                                    <div>Searches: {formatUsageWithLimit(user.job_searches || 0, limits.jobSearchesPerMonth)}</div>
                                    <div>AI Opt: {formatUsageWithLimit(user.ai_optimizations || 0, limits.aiOptimizations)}</div>
                                    <div>Letters: {formatUsageWithLimit(user.cover_letters_generated || 0, limits.coverLetters)}</div>
                                    <div>Exports: {formatUsageWithLimit(user.profile_exports || 0, limits.profileExports)}</div>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400">No usage</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab - Only show for admins */}
        {activeTab === 'users' && !isTesterOnly && <UserManagementTab />}

        {/* API Usage Tab */}
        {activeTab === 'api-usage' && apiUsage && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Requests Today</dt>
                        <dd className="text-lg font-medium text-gray-900">{apiUsage.summary.total_requests_today}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Daily Cost</dt>
                        <dd className="text-lg font-medium text-gray-900">${apiUsage.summary.total_cost_today.toFixed(4)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">APIs at Risk</dt>
                        <dd className="text-lg font-medium text-gray-900">{apiUsage.summary.apis_at_risk}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">APIs Warning</dt>
                        <dd className="text-lg font-medium text-gray-900">{apiUsage.summary.apis_warning}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed API Status */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Detailed API Usage</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Today</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reset Period</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiUsage.api_status.map((api) => (
                      <tr key={api.name}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{api.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{api.used} / {api.limit}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                api.status === 'danger' ? 'bg-red-500' :
                                api.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(api.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(api.status)}`}>
                            {api.percentage}% ({api.status})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${api.daily_cost.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {api.reset_period}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}