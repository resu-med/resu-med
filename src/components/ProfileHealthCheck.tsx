'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateProfileCompleteness, getProfileHealthStatus, type ProfileCompleteness } from '@/lib/profileCompleteness';

interface ProfileHealthCheckProps {
  profile: any;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection?: (sectionId: string) => void;
}

export default function ProfileHealthCheck({
  profile,
  isOpen,
  onClose,
  onNavigateToSection
}: ProfileHealthCheckProps) {
  const completeness = calculateProfileCompleteness(profile);
  const healthStatus = getProfileHealthStatus(completeness.overall.percentage);

  if (!isOpen) return null;

  const handleSectionClick = (sectionId: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    }
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200';
      case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'missing': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return '✅';
      case 'partial': return '⚠️';
      case 'missing': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{healthStatus.icon}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profile Health Check</h2>
                <p className="text-sm text-gray-600">Clinical analysis of your professional profile</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Health Score */}
          <div className={`p-4 rounded-lg border ${
            healthStatus.color === 'green' ? 'bg-green-50 border-green-200' :
            healthStatus.color === 'blue' ? 'bg-blue-50 border-blue-200' :
            healthStatus.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Profile Strength: {completeness.overall.percentage}% - {healthStatus.status.toUpperCase()}
                </h3>
                <p className={`text-sm ${
                  healthStatus.color === 'green' ? 'text-green-700' :
                  healthStatus.color === 'blue' ? 'text-blue-700' :
                  healthStatus.color === 'yellow' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {healthStatus.message}
                </p>
              </div>
              <div className="text-3xl">{healthStatus.icon}</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  healthStatus.color === 'green' ? 'bg-green-500' :
                  healthStatus.color === 'blue' ? 'bg-blue-500' :
                  healthStatus.color === 'yellow' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${completeness.overall.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🏥</span>
              Section Diagnosis
            </h3>
            <div className="space-y-3">
              {completeness.sections.map((section) => (
                <div
                  key={section.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getStatusColor(section.status)}`}
                  onClick={() => handleSectionClick(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(section.status)}</span>
                      <div>
                        <h4 className="font-medium">{section.name}</h4>
                        <p className="text-sm opacity-75">
                          {section.score}/{section.maxScore} points • Priority: {section.priority}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-75">{section.estimatedTime}</div>
                      <div className="text-xs font-medium">
                        {Math.round((section.score / section.maxScore) * 100)}%
                      </div>
                    </div>
                  </div>

                  {section.issues.length > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>Issues:</strong> {section.issues.join(', ')}
                    </div>
                  )}

                  {section.suggestions.length > 0 && (
                    <div className="mt-1 text-sm opacity-75">
                      <strong>Suggestions:</strong> {section.suggestions.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          {completeness.nextSteps.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🩺</span>
                Recommended Treatment Plan
              </h3>
              <div className="space-y-2">
                {completeness.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="bg-teal-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span className="text-teal-800 font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flow Navigation */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              What's Next?
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {/* Step 1: Complete Profile */}
              <div className={`p-4 rounded-lg border ${
                completeness.overall.percentage < 75
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {completeness.overall.percentage >= 75 ? '✅' : '✏️'}
                    </span>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        1. Complete Profile ({completeness.overall.percentage}%)
                      </h4>
                      <p className="text-sm text-gray-600">
                        {completeness.overall.percentage >= 75
                          ? 'Profile ready for job searching!'
                          : 'Fill in missing sections to unlock job search'}
                      </p>
                    </div>
                  </div>
                  {completeness.overall.percentage < 75 && (
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Fix Now
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Find Jobs */}
              <div className={`p-4 rounded-lg border ${
                completeness.readyForJobs
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {completeness.readyForJobs ? '🔍' : '🔒'}
                    </span>
                    <div>
                      <h4 className={`font-medium ${
                        completeness.readyForJobs ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        2. Find Perfect Jobs
                      </h4>
                      <p className={`text-sm ${
                        completeness.readyForJobs ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {completeness.readyForJobs
                          ? 'Search and match with job opportunities'
                          : 'Available when profile is 75%+ complete'}
                      </p>
                    </div>
                  </div>
                  {completeness.readyForJobs && (
                    <Link
                      href="/job-search"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={onClose}
                    >
                      Search Jobs
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 3: Generate Templates */}
              <div className={`p-4 rounded-lg border ${
                completeness.readyForTemplates
                  ? 'border-purple-200 bg-purple-50'
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {completeness.readyForTemplates ? '📄' : '🔒'}
                    </span>
                    <div>
                      <h4 className={`font-medium ${
                        completeness.readyForTemplates ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        3. Generate Resume & Cover Letters
                      </h4>
                      <p className={`text-sm ${
                        completeness.readyForTemplates ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {completeness.readyForTemplates
                          ? 'Create optimized documents for applications'
                          : 'Available when profile is 85%+ complete'}
                      </p>
                    </div>
                  </div>
                  {completeness.readyForTemplates && (
                    <Link
                      href="/templates"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={onClose}
                    >
                      Generate
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-4 rounded-lg border border-teal-200">
            <h4 className="font-medium text-teal-900 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-teal-800 space-y-1">
              <li>• Complete profiles get 3x more job matches</li>
              <li>• Add specific achievements and metrics to stand out</li>
              <li>• Include relevant keywords for better ATS optimization</li>
              <li>• 85%+ completion unlocks premium features</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Continue Later
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all"
            >
              Start Improving
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}