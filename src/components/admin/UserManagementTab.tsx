'use client';

import React, { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';

interface User {
  id: number;
  email: string;
  name: string;
  email_verified: boolean;
  is_admin: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  plan_id?: string;
  tier?: string;
  status?: string;
  job_searches?: number;
  ai_optimizations?: number;
  cover_letters_generated?: number;
  profile_exports?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getSubscriptionLimits = (planId?: string) => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0]; // Default to free
  return plan.limits;
};

const formatUsageWithLimit = (current: number, limit: number) => {
  if (limit === -1) return `${current}/∞`;
  return `${current}/${limit}`;
};

export default function UserManagementTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'last_login_at' | 'email'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'admin' | 'verified' | 'unverified'>('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm,
        sortBy,
        sortOrder,
        filterBy
      });

      const response = await fetch(`/api/admin/users?${params}`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, sortBy, sortOrder, filterBy]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin: !currentStatus }),
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
      } else {
        console.error('Failed to toggle admin status');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchUsers(); // Refresh the list
        } else {
          console.error('Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBadgeColor = (status: boolean | string | undefined, type: 'admin' | 'verified' | 'subscription') => {
    if (type === 'admin') {
      return status ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
    }
    if (type === 'verified') {
      return status ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    }
    if (type === 'subscription') {
      switch (status) {
        case 'pro': return 'bg-blue-100 text-blue-800';
        case 'professional': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        <p className="text-sm text-gray-600">Manage all users, their permissions, and account status.</p>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins Only</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="last_login_at-desc">Recently Active</option>
              <option value="email-asc">Email A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No users found matching your criteria.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage This Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const limits = getSubscriptionLimits(user.plan_id);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(user.is_admin, 'admin')}`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(user.email_verified, 'verified')}`}>
                          {user.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(user.tier || 'free', 'subscription')}`}>
                        {(user.tier || 'free').charAt(0).toUpperCase() + (user.tier || 'free').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>Searches: {formatUsageWithLimit(user.job_searches || 0, limits.jobSearches)}</div>
                        <div>AI: {formatUsageWithLimit(user.ai_optimizations || 0, limits.aiOptimizations)}</div>
                        <div>Letters: {formatUsageWithLimit(user.cover_letters_generated || 0, limits.coverLetters)}</div>
                        <div>Exports: {formatUsageWithLimit(user.profile_exports || 0, limits.profileExports)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{formatDate(user.created_at)}</div>
                        {user.last_login_at && (
                          <div className="text-xs text-gray-400">
                            Last: {formatDate(user.last_login_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            user.is_admin
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          }`}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-medium hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 border rounded text-sm ${
                  pagination.page === page
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}