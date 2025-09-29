'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import AccountDropdown from '@/components/AccountDropdown';
import ProgressBreadcrumbs from '@/components/ProgressBreadcrumbs';

interface ResponsiveNavigationProps {
  currentPage?: 'home' | 'profile' | 'job-search' | 'templates';
  showProgressBreadcrumbs?: boolean;
  currentSection?: string;
  onNavigateToSection?: (sectionId: string) => void;
}

export default function ResponsiveNavigation({
  currentPage,
  showProgressBreadcrumbs = true,
  currentSection,
  onNavigateToSection
}: ResponsiveNavigationProps) {
  const { state: authState, logout } = useAuth();
  const { state: profileState } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getLinkClassName = (page: string) => {
    if (currentPage === page) {
      return "bg-gradient-to-r from-teal-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md";
    }
    return "text-gray-600 hover:text-teal-600 font-medium transition-colors";
  };

  const getMobileLinkClassName = (page: string) => {
    if (currentPage === page) {
      return "block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-teal-600 to-blue-600 text-white";
    }
    return "block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50";
  };

  return (
    <div>
      <nav className="bg-white shadow-sm border-b-2 border-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4" />
                <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                ResuMed
              </h1>
              <p className="text-xs text-teal-600 -mt-1">Clinical Resume Care</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {authState.isAuthenticated && (
              <>
                {authState.user?.isAdmin && (
                  <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-medium transition-colors border border-purple-300 px-3 py-1 rounded-md hover:bg-purple-50">
                    Admin
                  </Link>
                )}
                <Link href="/profile" className={getLinkClassName('profile')}>
                  Profile Builder
                </Link>
                <Link href="/job-search" className={getLinkClassName('job-search')}>
                  Job Search
                </Link>
                <Link href="/templates" className={getLinkClassName('templates')}>
                  Templates
                </Link>
              </>
            )}
            <Link href="/about" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
              About
            </Link>

            {authState.isAuthenticated ? (
              <AccountDropdown />
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth"
                  className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-teal-600 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-teal-100">
              {authState.isAuthenticated ? (
                <>
                  {authState.user?.isAdmin && (
                    <Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 border border-purple-300 mx-2" onClick={closeMobileMenu}>
                      Admin Dashboard
                    </Link>
                  )}
                  <Link href="/profile" className={getMobileLinkClassName('profile')} onClick={closeMobileMenu}>
                    Profile Builder
                  </Link>
                  <Link href="/job-search" className={getMobileLinkClassName('job-search')} onClick={closeMobileMenu}>
                    Job Search
                  </Link>
                  <Link href="/templates" className={getMobileLinkClassName('templates')} onClick={closeMobileMenu}>
                    Templates
                  </Link>
                  <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50" onClick={closeMobileMenu}>
                    About
                  </Link>

                  {/* Mobile Account Section */}
                  <div className="border-t border-gray-200 pt-4 pb-3">
                    <div className="flex items-center px-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {profileState.profile.personalInfo.firstName?.[0] || authState.user?.name?.[0] || authState.user?.email?.[0] || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-base font-medium text-gray-800">
                          {profileState.profile.personalInfo.firstName || profileState.profile.personalInfo.lastName ? `${profileState.profile.personalInfo.firstName} ${profileState.profile.personalInfo.lastName}`.trim() : authState.user?.name || 'User'}
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                          {authState.user?.email}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <Link href="/account/preferences" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50" onClick={closeMobileMenu}>
                        Account Settings
                      </Link>
                      <Link href="/account/billing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50" onClick={closeMobileMenu}>
                        Billing
                      </Link>
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          logout();
                        }}
                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50" onClick={closeMobileMenu}>
                    About
                  </Link>
                  <Link href="/auth" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50" onClick={closeMobileMenu}>
                    Sign In
                  </Link>
                  <Link href="/auth?mode=signup" className="block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-teal-600 to-blue-600 text-white" onClick={closeMobileMenu}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>

    {/* Progress Breadcrumbs - Disabled to avoid visual clutter and logout bugs */}
    {/* {authState.isAuthenticated && showProgressBreadcrumbs && (
      <ProgressBreadcrumbs
        profile={profileState.profile}
        currentSection={currentSection || 'upload'}
        onNavigateToSection={onNavigateToSection || (() => {})}
      />
    )} */}
  </div>
  );
}