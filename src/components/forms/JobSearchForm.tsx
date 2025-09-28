'use client';

import { useState, useEffect } from 'react';
import { JobSearchFilters, JobListing } from '@/types/profile';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface JobSearchFormProps {
  onSearch: (filters: JobSearchFilters) => Promise<void>;
  results: JobListing[];
  loading: boolean;
  onSaveJob: (job: JobListing) => void;
  onApplyJob: (job: JobListing) => void;
  sources?: string[];
  pagination?: PaginationInfo;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  onPageChange?: (page: number) => void;
}

export default function JobSearchForm({
  onSearch,
  results,
  loading,
  onSaveJob,
  onApplyJob,
  sources,
  pagination,
  onNextPage,
  onPreviousPage,
  onPageChange
}: JobSearchFormProps) {
  const [filters, setFilters] = useState<JobSearchFilters>({
    keywords: '',
    location: '',
    jobType: '',
    experienceLevel: '',
    salaryMin: undefined,
    salaryMax: undefined,
    remote: false
  });

  const [filteredSources, setFilteredSources] = useState<string[]>([]);

  // Provider selection for search
  const [selectedProviders, setSelectedProviders] = useState<string[]>([
    'JSearch', 'Jooble', 'The Muse', 'RemoteOK', 'Reed', 'Adzuna'
  ]);

  // Load persisted search filters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem('resumed_last_search_filters');
      if (savedFilters) {
        try {
          const parsedFilters = JSON.parse(savedFilters);
          setFilters(parsedFilters);
        } catch (error) {
          console.error('Error loading saved search filters:', error);
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔧 Form submitting with providers:', selectedProviders);
    const filtersWithProviders = {
      ...filters,
      selectedProviders: selectedProviders
    };
    console.log('🔧 Final filters being sent:', filtersWithProviders);
    await onSearch(filtersWithProviders);
  };

  const handleFilterChange = (key: keyof JobSearchFilters, value: string | number | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Helper functions for source styling and filtering
  const getSourceStyle = (source: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all";
    const isSelected = selectedProviders.includes(source);

    switch (source) {
      case 'Reed':
        return `${baseClasses} ${isSelected ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-blue-100'}`;
      case 'Adzuna':
        return `${baseClasses} ${isSelected ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-green-100'}`;
      case 'JSearch':
        return `${baseClasses} ${isSelected ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-orange-100'}`;
      case 'Jooble':
        return `${baseClasses} ${isSelected ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-red-100'}`;
      case 'The Muse':
        return `${baseClasses} ${isSelected ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100'}`;
      case 'RemoteOK':
        return `${baseClasses} ${isSelected ? 'bg-pink-100 text-pink-800 hover:bg-pink-200' : 'bg-gray-100 text-gray-500 hover:bg-pink-100'}`;
      default:
        return `${baseClasses} ${isSelected ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`;
    }
  };

  const toggleSourceFilter = (source: string) => {
    setFilteredSources(prev => {
      if (prev.includes(source)) {
        // Remove source from filter
        return prev.filter(s => s !== source);
      } else {
        // Add source to filter
        return [...prev, source];
      }
    });
  };

  // Filter results based on selected sources
  const filteredResults = filteredSources.length === 0
    ? results
    : results.filter(job => filteredSources.includes(job.source));

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Search Open Roles</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Providers:</span>
            {[
              { name: 'JSearch', color: 'orange' },
              { name: 'Jooble', color: 'red' },
              { name: 'The Muse', color: 'indigo' },
              { name: 'RemoteOK', color: 'pink' },
              { name: 'Reed', color: 'blue' },
              { name: 'Adzuna', color: 'green' }
            ].map((provider) => (
              <button
                key={provider.name}
                onClick={() => {
                  if (selectedProviders.includes(provider.name)) {
                    setSelectedProviders(prev => prev.filter(p => p !== provider.name));
                  } else {
                    setSelectedProviders(prev => [...prev, provider.name]);
                  }
                }}
                className={getSourceStyle(provider.name)}
                title={`Click to ${selectedProviders.includes(provider.name) ? 'disable' : 'enable'} ${provider.name} search`}
              >
                {provider.name}
                <span className="ml-1">
                  {selectedProviders.includes(provider.name) ? '✓' : '○'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keywords */}
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <input
                type="text"
                id="keywords"
                value={filters.keywords}
                onChange={(e) => handleFilterChange('keywords', e.target.value)}
                placeholder="e.g., Software Engineer, Marketing Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="e.g., New York, Remote, San Francisco"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            {/* Job Type */}
            <div>
              <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                id="jobType"
                value={filters.jobType}
                onChange={(e) => handleFilterChange('jobType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Experience Level
              </label>
              <select
                id="experienceLevel"
                value={filters.experienceLevel}
                onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Any</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 mb-1">
                Salary Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  id="salaryMin"
                  value={filters.salaryMin || ''}
                  onChange={(e) => handleFilterChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <input
                  type="number"
                  id="salaryMax"
                  value={filters.salaryMax || ''}
                  onChange={(e) => handleFilterChange('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Remote Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remote"
                checked={filters.remote}
                onChange={(e) => handleFilterChange('remote', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remote" className="ml-2 block text-sm text-gray-700">
                Remote work only
              </label>
            </div>
          </div>


          <button
            type="submit"
            disabled={loading || !filters.keywords.trim() || selectedProviders.length === 0}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : selectedProviders.length === 0 ? 'Select Providers to Search' : 'Search Jobs'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Searching for opportunities...</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {pagination ? (
                <>Found {pagination.total} opportunities (showing {filteredResults.length}{filteredSources.length > 0 ? ' filtered' : ''})</>
              ) : (
                <>Found {filteredResults.length} opportunities{filteredSources.length > 0 ? ' (filtered)' : ''}</>
              )}
            </h3>
            {filteredSources.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing only: {filteredSources.join(', ')}
              </div>
            )}
          </div>

          {filteredResults.map((job) => (
            <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      {job.title}
                    </a>
                  </h4>
                  <p className="text-gray-600">{job.company} • {job.location}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onSaveJob(job)}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      job.saved
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {job.saved ? '★ Saved' : '☆ Save'}
                  </button>
                  <button
                    onClick={() => onApplyJob(job)}
                    disabled={job.applied}
                    className={`px-3 py-1 text-sm font-medium rounded ${
                      job.applied
                        ? 'bg-green-100 text-green-800 border border-green-300 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'
                    }`}
                  >
                    {job.applied ? '✓ Applied' : 'Apply'}
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-gray-700 line-clamp-3">{job.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="bg-gray-100 px-2 py-1 rounded">{job.type}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{job.experienceLevel}</span>
                {job.salary && <span className="bg-green-100 px-2 py-1 rounded text-green-800">{job.salary}</span>}
                <span className={getSourceStyle(job.source).replace('cursor-pointer', '')}>
                  {job.source}
                </span>
                <span className="ml-auto">{new Date(job.datePosted).toLocaleDateString()}</span>
              </div>

              {job.skills.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-1">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 8).map((skill, index) => (
                      <span key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 8 && (
                      <span className="text-gray-500 text-xs px-2 py-1">
                        +{job.skills.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              <div className="text-sm text-gray-600">
                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} total results)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onPreviousPage}
                  disabled={!pagination.hasPreviousPage || loading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                    if (pageNum > pagination.totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange?.(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          pageNum === pagination.currentPage
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={onNextPage}
                  disabled={!pagination.hasNextPage || loading}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filteredResults.length === 0 && results.length > 0 && filteredSources.length > 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No jobs found from the selected sources: {filteredSources.join(', ')}</p>
          <button
            onClick={() => setFilteredSources([])}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Clear source filters to see all results
          </button>
        </div>
      )}

      {results.length === 0 && !loading && filters.keywords.trim() && (
        <div className="text-center py-8 text-gray-500">
          <p>No jobs found matching your criteria. Try adjusting your search filters.</p>
        </div>
      )}
    </div>
  );
}