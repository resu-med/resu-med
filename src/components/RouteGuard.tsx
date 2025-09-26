'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export default function RouteGuard({
  children,
  requireAuth = true,
  requireAdmin = false
}: RouteGuardProps) {
  const { state, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && !state.isAuthenticated && !state.isLoading) {
      router.push('/auth');
      return;
    }

    if (requireAdmin && state.isAuthenticated && !isAdmin()) {
      router.push('/job-search');
      return;
    }
  }, [state.isAuthenticated, state.isLoading, requireAuth, requireAdmin, isAdmin, router]);

  // Show loading spinner while checking auth
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if auth is required but user is not authenticated
  if (requireAuth && !state.isAuthenticated) {
    return null;
  }

  // Don't render if admin is required but user is not admin
  if (requireAdmin && (!state.isAuthenticated || !isAdmin())) {
    return null;
  }

  return <>{children}</>;
}