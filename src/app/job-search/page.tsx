'use client';

import { useState, useEffect } from 'react';
import JobSearchForm from '@/components/forms/JobSearchForm';
import { JobListing, JobSearchFilters } from '@/types/profile';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import RouteGuard from '@/components/RouteGuard';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import ClinicalTreatmentPlan from '@/components/ClinicalTreatmentPlan';

// Local storage keys
const STORAGE_KEYS = {
  JOB_RESULTS: 'resumed_job_results',
  ACTIVE_SOURCES: 'resumed_active_sources',
  LAST_SEARCH_FILTERS: 'resumed_last_search_filters',
  SEARCH_TIMESTAMP: 'resumed_search_timestamp'
};

// Cache duration (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

function JobSearchPageContent() {
  const { canPerformAction, incrementUsage, getRemainingUsage, getCurrentPlan } = useSubscription();
  const { state: authState, logout } = useAuth();
  const { state: profileState } = useProfile();
  const [jobResults, setJobResults] = useState<JobListing[]>([]);
  const [jobSearchLoading, setJobSearchLoading] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Load persisted data on component mount
  useEffect(() => {
    loadPersistedData();
  }, []);

  // Save data to localStorage whenever results change
  useEffect(() => {
    if (jobResults.length > 0) {
      saveToLocalStorage();
    }
  }, [jobResults, activeSources]);

  const loadPersistedData = () => {
    if (typeof window === 'undefined') return;

    try {
      const timestamp = localStorage.getItem(STORAGE_KEYS.SEARCH_TIMESTAMP);
      console.log('📚 Loading persisted data, timestamp:', timestamp);

      if (timestamp) {
        const searchAge = Date.now() - parseInt(timestamp);
        console.log('⏱️ Search age:', searchAge, 'Cache duration:', CACHE_DURATION);

        // Only load if search is less than 30 minutes old
        if (searchAge < CACHE_DURATION) {
          const savedResults = localStorage.getItem(STORAGE_KEYS.JOB_RESULTS);
          const savedSources = localStorage.getItem(STORAGE_KEYS.ACTIVE_SOURCES);

          console.log('💾 Found saved data:', {
            resultsCount: savedResults ? JSON.parse(savedResults).length : 0,
            sourcesCount: savedSources ? JSON.parse(savedSources).length : 0
          });

          if (savedResults) {
            const parsedResults = JSON.parse(savedResults);
            setJobResults(parsedResults);
            console.log('✅ Restored job results:', parsedResults.length, 'jobs');
          }
          if (savedSources) {
            const parsedSources = JSON.parse(savedSources);
            setActiveSources(parsedSources);
            console.log('✅ Restored active sources:', parsedSources);
          }
        } else {
          console.log('⚠️ Data expired, clearing cache');
          clearPersistedData();
        }
      } else {
        console.log('📭 No persisted search data found');
      }
    } catch (error) {
      console.error('❌ Error loading persisted job search data:', error);
    }
  };

  const saveToLocalStorage = () => {
    if (typeof window === 'undefined') return;

    try {
      console.log('💾 Saving to localStorage:', {
        jobResultsCount: jobResults.length,
        activeSources: activeSources,
        timestamp: new Date().toISOString()
      });

      localStorage.setItem(STORAGE_KEYS.JOB_RESULTS, JSON.stringify(jobResults));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SOURCES, JSON.stringify(activeSources));
      localStorage.setItem(STORAGE_KEYS.SEARCH_TIMESTAMP, Date.now().toString());

      console.log('✅ Successfully saved job search data');
    } catch (error) {
      console.error('❌ Error saving job search data:', error);
    }
  };

  const clearPersistedData = () => {
    if (typeof window === 'undefined') return;

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  // Pagination handlers
  const handlePageChange = async (newPage: number) => {
    const lastFilters = localStorage.getItem(STORAGE_KEYS.LAST_SEARCH_FILTERS);
    if (lastFilters) {
      const filters = JSON.parse(lastFilters);
      await handleJobSearch(filters, newPage);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(pagination.currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      handlePageChange(pagination.currentPage - 1);
    }
  };

  // Job search handlers
  const handleJobSearch = async (filters: JobSearchFilters, page: number = 1) => {
    // Check if user can perform job search
    if (!canPerformAction('job-search')) {
      alert(`You've reached your job search limit. Upgrade to Pro for unlimited searches!`);
      return;
    }

    setJobSearchLoading(true);
    try {
      const response = await fetch('/api/job-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...filters,
          page,
          pageSize: pagination.pageSize
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Check if we have a setup message (no API keys configured)
        if (data.message && data.setupInstructions) {
          console.log('⚠️ API setup required:', data.message);
          alert(`${data.message}\n\nSetup Instructions:\n• Reed API: ${data.setupInstructions.reed}\n• Adzuna API: ${data.setupInstructions.adzuna}\n\nAdd the API keys to your environment variables and restart the application.`);
          setJobResults([]);
          setActiveSources([]);
          return;
        }

        setJobResults(data.jobs || []);
        setActiveSources(data.sources || []);
        setPagination({
          currentPage: data.currentPage,
          totalPages: data.totalPages,
          total: data.total,
          pageSize: data.pageSize,
          hasNextPage: data.hasNextPage,
          hasPreviousPage: data.hasPreviousPage
        });

        // Increment usage for successful job search
        incrementUsage('job-search');

        // Save the search filters for persistence
        localStorage.setItem(STORAGE_KEYS.LAST_SEARCH_FILTERS, JSON.stringify(filters));
      } else {
        console.error('Job search failed');
        setJobResults([]);
        setActiveSources([]);
      }
    } catch (error) {
      console.error('Job search error:', error);
      setJobResults([]);
      setActiveSources([]);
    } finally {
      setJobSearchLoading(false);
    }
  };

  // Clear search results and persistent data
  const handleClearSearch = () => {
    setJobResults([]);
    setActiveSources([]);
    clearPersistedData();
  };

  const handleSaveJob = (job: JobListing) => {
    setJobResults(prev => prev.map(j =>
      j.id === job.id ? { ...j, saved: !j.saved } : j
    ));
    // TODO: Persist saved jobs to context/backend
  };

  const handleApplyJob = (job: JobListing) => {
    setJobResults(prev => prev.map(j =>
      j.id === job.id ? { ...j, applied: true } : j
    ));
    // Open job URL in new tab
    window.open(job.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50">
        <ResponsiveNavigation currentPage="job-search" />
      </div>

      {/* Clinical Treatment Plan */}
      <ClinicalTreatmentPlan profile={profileState.profile} currentStep="treatment" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                Job Search
              </h1>
              <p className="text-teal-600 font-medium">Find Your Next Career Opportunity</p>
            </div>
          </div>

          <p className="text-gray-600 text-lg max-w-3xl">
            Discover job opportunities from top companies across multiple job boards. Use our advanced search filters
            to find positions that match your skills and career goals.
          </p>
        </div>

        {/* Job Search Form and Results */}
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Search Job Opportunities</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Multi-API integration with Reed, Adzuna, Indeed and intelligent fallbacks for comprehensive coverage
                </p>
                {jobResults.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    💾 Search results are automatically saved and will persist when you navigate between tabs
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {jobResults.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    title="Clear search results"
                  >
                    🗑️ Clear
                  </button>
                )}
                <div className="text-2xl">🔍</div>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <JobSearchForm
              onSearch={handleJobSearch}
              results={jobResults}
              loading={jobSearchLoading}
              onSaveJob={handleSaveJob}
              onApplyJob={handleApplyJob}
              sources={activeSources}
              pagination={pagination}
              onNextPage={handleNextPage}
              onPreviousPage={handlePreviousPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-API Integration</h3>
            <p className="text-gray-600 text-sm">
              Comprehensive job search across Reed, Adzuna, Indeed, and other major job boards with intelligent fallbacks
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Filtering</h3>
            <p className="text-gray-600 text-sm">
              Advanced filters for location, salary, experience level, job type, and remote work options
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Save & Track</h3>
            <p className="text-gray-600 text-sm">
              Bookmark interesting positions and track your application status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobSearchPage() {
  return (
    <RouteGuard requireAuth={true}>
      <JobSearchPageContent />
    </RouteGuard>
  );
}