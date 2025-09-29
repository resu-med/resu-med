'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useProfile } from '@/contexts/ProfileContext';
import Link from 'next/link';

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { state: authState, logout } = useAuth();
  const { getCurrentPlan, state: subState } = useSubscription();
  const { state: profileState } = useProfile();

  const currentPlan = getCurrentPlan();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return 'text-green-600'; // Unlimited
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!authState.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-teal-600 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full text-white font-medium text-xs">
          {profileState.profile.personalInfo.firstName?.charAt(0).toUpperCase() || authState.user.name?.charAt(0).toUpperCase() || authState.user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">
          {profileState.profile.personalInfo.firstName || profileState.profile.personalInfo.lastName ? `${profileState.profile.personalInfo.firstName} ${profileState.profile.personalInfo.lastName}`.trim() : authState.user.name || authState.user.email}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full text-white font-semibold">
                {profileState.profile.personalInfo.firstName?.charAt(0).toUpperCase() || authState.user.name?.charAt(0).toUpperCase() || authState.user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{profileState.profile.personalInfo.firstName || profileState.profile.personalInfo.lastName ? `${profileState.profile.personalInfo.firstName} ${profileState.profile.personalInfo.lastName}`.trim() : authState.user.name}</p>
                <p className="text-sm text-gray-500">{authState.user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    currentPlan.id === 'free' ? 'bg-gray-100 text-gray-800' :
                    currentPlan.id === 'pro' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {currentPlan.name}
                  </span>
                  {authState.user.role === 'admin' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Current Plan</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="text-sm font-medium text-gray-900">{currentPlan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Price</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentPlan.price === 0 ? 'Free' : `£${currentPlan.price}/month`}
                </span>
              </div>
            </div>

            {/* Usage Stats */}
            {subState.user?.usage && (
              <div className="mt-3 space-y-2">
                <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Usage This Month</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Searches</span>
                    <span className={getUsageColor(subState.user.usage.jobSearches, currentPlan.limits.jobSearchesPerMonth)}>
                      {subState.user.usage.jobSearches}
                      {currentPlan.limits.jobSearchesPerMonth !== -1 && `/${currentPlan.limits.jobSearchesPerMonth}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Optimizations</span>
                    <span className={getUsageColor(subState.user.usage.aiOptimizations, currentPlan.limits.aiOptimizations)}>
                      {subState.user.usage.aiOptimizations}
                      {currentPlan.limits.aiOptimizations !== -1 && `/${currentPlan.limits.aiOptimizations}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cover Letters</span>
                    <span className={getUsageColor(subState.user.usage.coverLettersGenerated, currentPlan.limits.coverLetters)}>
                      {subState.user.usage.coverLettersGenerated}
                      {currentPlan.limits.coverLetters !== -1 && `/${currentPlan.limits.coverLetters}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exports</span>
                    <span className={getUsageColor(subState.user.usage.profileExports, currentPlan.limits.profileExports)}>
                      {subState.user.usage.profileExports}
                      {currentPlan.limits.profileExports !== -1 && `/${currentPlan.limits.profileExports}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {currentPlan.id === 'free' && (
              <button className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Upgrade to Pro</span>
              </button>
            )}

            <Link href="/account/billing" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Billing & Payments</span>
            </Link>

            <Link href="/account/preferences" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Account Settings</span>
            </Link>

            {authState.user.role === 'admin' && (
              <Link href="/admin" className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Admin Dashboard</span>
              </Link>
            )}

            <Link href="/help" className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Help & Support</span>
            </Link>

            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}