'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateProfileCompleteness, getProfileHealthStatus } from '@/lib/profileCompleteness';

interface InlineProgressCardProps {
  profile: any;
  onNavigateToSection?: (sectionId: string) => void;
  onQuickAction?: (action: string, data?: any) => void;
}

export default function InlineProgressCard({
  profile,
  onNavigateToSection,
  onQuickAction
}: InlineProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completeness = calculateProfileCompleteness(profile);
  const healthStatus = getProfileHealthStatus(completeness.overall.percentage);

  // Find the most important missing section
  const highPriorityMissing = completeness.sections
    .filter(section => section.priority === 'high' && section.issues.length > 0)
    .sort((a, b) => a.score - b.score)[0];

  const getQuickAction = () => {
    if (!highPriorityMissing) return null;

    switch (highPriorityMissing.id) {
      case 'personal':
        if (highPriorityMissing.issues.includes('Missing Phone number')) {
          return {
            text: 'Add Phone (30 sec)',
            action: 'quick-phone',
            icon: '📞',
            benefit: 'Unlock job search'
          };
        }
        break;
      case 'experience':
        return {
          text: 'Add Job (2 min)',
          action: 'quick-job',
          icon: '💼',
          benefit: 'Show your experience'
        };
      case 'skills':
        return {
          text: 'Add Skills (1 min)',
          action: 'quick-skills',
          icon: '⚡',
          benefit: 'Match more jobs'
        };
      case 'education':
        return {
          text: 'Add Education (1 min)',
          action: 'quick-education',
          icon: '🎓',
          benefit: 'Complete your background'
        };
    }
    return null;
  };

  const quickAction = getQuickAction();

  const handleQuickAction = () => {
    if (quickAction && onQuickAction) {
      onQuickAction(quickAction.action);
    }
  };

  const handleSectionClick = () => {
    if (highPriorityMissing && onNavigateToSection) {
      onNavigateToSection(highPriorityMissing.id);
    }
  };

  return (
    <div className={`rounded-lg border transition-all duration-300 ${
      completeness.overall.percentage >= 85 ? 'bg-green-50 border-green-200' :
      completeness.overall.percentage >= 75 ? 'bg-blue-50 border-blue-200' :
      completeness.overall.percentage >= 50 ? 'bg-yellow-50 border-yellow-200' :
      'bg-red-50 border-red-200'
    }`}>
      {/* Main Progress Display */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{healthStatus.icon}</div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                <span>Profile Strength: {completeness.overall.percentage}%</span>
                {completeness.overall.percentage < 85 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {isExpanded ? '▼' : '▶'} Details
                  </button>
                )}
              </h3>
              <p className={`text-sm ${
                completeness.overall.percentage >= 85 ? 'text-green-700' :
                completeness.overall.percentage >= 75 ? 'text-blue-700' :
                completeness.overall.percentage >= 50 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {healthStatus.message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Quick Action for Missing Section */}
            {quickAction && (
              <button
                onClick={handleQuickAction}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center space-x-1"
              >
                <span>{quickAction.icon}</span>
                <span>{quickAction.text}</span>
              </button>
            )}

            {/* Flow CTAs */}
            {completeness.readyForJobs && (
              <Link
                href="/job-search"
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-1"
              >
                <span>🔍</span>
                <span>Search Jobs</span>
              </Link>
            )}

            {completeness.readyForTemplates && (
              <Link
                href="/templates"
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-1"
              >
                <span>📄</span>
                <span>Generate</span>
              </Link>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              completeness.overall.percentage >= 85 ? 'bg-green-500' :
              completeness.overall.percentage >= 75 ? 'bg-blue-500' :
              completeness.overall.percentage >= 50 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${completeness.overall.percentage}%` }}
          ></div>
        </div>

        {/* Quick Benefit */}
        {quickAction && (
          <div className="mt-2 text-xs text-gray-600 flex items-center space-x-1">
            <span>💡</span>
            <span>{quickAction.benefit} • {highPriorityMissing?.estimatedTime}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Missing Sections:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {completeness.sections
              .filter(section => section.issues.length > 0)
              .slice(0, 4)
              .map((section) => (
                <button
                  key={section.id}
                  onClick={() => onNavigateToSection?.(section.id)}
                  className="text-left p-2 rounded border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{section.name}</span>
                    <span className="text-xs text-gray-500">{section.estimatedTime}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{section.issues[0]}</p>
                </button>
              ))}
          </div>

          {/* See Full Analysis */}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Collapse details
          </button>
        </div>
      )}
    </div>
  );
}