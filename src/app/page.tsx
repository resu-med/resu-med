'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';

export default function Home() {
  const { state: authState, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <ResponsiveNavigation currentPage="home" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Resume Treatment with
            <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent"> Clinical Precision</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Just like medical diagnosis, your resume needs expert analysis. Our AI provides clinical-grade precision in matching your profile to job requirements, ensuring optimal career health.
          </p>

          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              href={authState.isAuthenticated ? "/profile" : "/auth"}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl inline-block"
            >
              📋 Start Your Career Checkup
            </Link>
            <Link
              href={authState.isAuthenticated ? "/job-search" : "/auth"}
              className="w-full sm:w-auto border-2 border-teal-200 hover:border-teal-400 text-teal-700 hover:bg-teal-50 px-8 py-3 rounded-lg text-lg font-medium transition-all inline-block"
            >
              🩺 View Treatment Options
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-gradient-to-br from-teal-100 to-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient History Intake</h3>
            <p className="text-gray-600">
              Comprehensive career profile assessment including experience, education, skills, and professional interests.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">🔬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Diagnostic Analysis</h3>
            <p className="text-gray-600">
              Advanced algorithms analyze job requirements and provide precise recommendations for optimal career alignment.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">💊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prescription-Grade Results</h3>
            <p className="text-gray-600">
              Export professionally formatted, ATS-optimized resumes with clinical precision for maximum effectiveness.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-teal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4" />
                  <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                ResuMed
              </span>
            </div>
            <p className="text-gray-600">
              &copy; 2024 ResuMed - Clinical Resume Care. Providing professional career health solutions.
            </p>
            <p className="text-sm text-teal-600 mt-2">
              🏥 Your career deserves expert care
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}