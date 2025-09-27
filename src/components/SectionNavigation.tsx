'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

interface SectionNavigationProps {
  currentSection: string;
  onNavigateToSection: (sectionId: string) => void;
  onQuickAction?: (action: string) => void;
  profile: any;
}

export default function SectionNavigation({
  currentSection,
  onNavigateToSection,
  onQuickAction,
  profile
}: SectionNavigationProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const router = useRouter();

  const sections = [
    { id: 'upload', label: 'Import Resume', icon: '📋' },
    { id: 'personal', label: 'Personal Info', icon: '🩺' },
    { id: 'experience', label: 'Work History', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
    { id: 'interests', label: 'Interests', icon: '🌟' }
  ];

  const completeness = calculateProfileCompleteness(profile);
  const currentIndex = sections.findIndex(s => s.id === currentSection);
  const currentSectionData = sections[currentIndex];

  // Smart next section logic
  const getNextSection = () => {
    // If current section is incomplete and high priority, suggest staying
    const currentCompleteness = completeness.sections.find(s => s.id === currentSection);
    const isCurrentIncomplete = currentCompleteness?.issues.length > 0;
    const isHighPriority = currentCompleteness?.priority === 'high';

    // Find next incomplete high-priority section
    const nextIncompleteHighPriority = completeness.sections
      .filter(s => s.priority === 'high' && s.issues.length > 0)
      .find(s => sections.findIndex(sec => sec.id === s.id) > currentIndex);

    if (nextIncompleteHighPriority) {
      return sections.find(s => s.id === nextIncompleteHighPriority.id);
    }

    // Otherwise, go to next section in order
    if (currentIndex < sections.length - 1) {
      return sections[currentIndex + 1];
    }

    // If at end, suggest job search if ready
    if (completeness.readyForJobs) {
      return { id: 'job-search', label: 'Job Search', icon: '🔍' };
    }

    return null;
  };

  const getPreviousSection = () => {
    if (currentIndex > 0) {
      return sections[currentIndex - 1];
    }
    return null;
  };

  const nextSection = getNextSection();
  const previousSection = getPreviousSection();

  // Get current section completion info
  const currentSectionCompletion = completeness.sections.find(s => s.id === currentSection);
  const hasQuickAction = currentSectionCompletion?.issues.length > 0 && currentSectionCompletion?.priority === 'high';

  const getQuickActionForSection = () => {
    if (!hasQuickAction) return null;

    switch (currentSection) {
      case 'personal':
        if (currentSectionCompletion.issues.includes('Missing Phone number')) {
          return { text: 'Add Phone', action: 'quick-phone', time: '30 sec' };
        }
        break;
      case 'experience':
        return { text: 'Add Job', action: 'quick-job', time: '2 min' };
      case 'skills':
        return { text: 'Add Skills', action: 'quick-skills', time: '1 min' };
      case 'education':
        return { text: 'Add Education', action: 'quick-education', time: '1 min' };
    }
    return null;
  };

  const quickAction = getQuickActionForSection();

  const handleNext = () => {
    if (nextSection?.id === 'job-search') {
      router.push('/job-search');
    } else if (nextSection) {
      onNavigateToSection(nextSection.id);
    }
  };

  const handlePrevious = () => {
    if (previousSection) {
      onNavigateToSection(previousSection.id);
    }
  };

  const handleSkip = () => {
    // Mark section as skipped and move to next
    if (nextSection) {
      handleNext();
    }
  };

  const handleQuickAction = () => {
    if (quickAction && onQuickAction) {
      onQuickAction(quickAction.action);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-teal-600 text-white p-3 rounded-full shadow-lg hover:bg-teal-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Previous Section */}
          <div className="flex items-center space-x-3">
            {previousSection ? (
              <button
                onClick={handlePrevious}
                className="flex items-center space-x-2 text-gray-600 hover:text-teal-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{previousSection.label}</span>
              </button>
            ) : (
              <div className="w-20"></div> // Spacer
            )}
          </div>

          {/* Current Section Info */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{currentSectionData?.icon}</span>
                <span className="font-medium text-gray-900">{currentSectionData?.label}</span>
              </div>
              <div className="text-xs text-gray-500">
                Section {currentIndex + 1} of {sections.length} • {completeness.overall.percentage}% Complete
              </div>
            </div>

            {/* Quick Action */}
            {quickAction && (
              <button
                onClick={handleQuickAction}
                className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center space-x-1"
              >
                <span>⚡</span>
                <span>{quickAction.text}</span>
                <span className="text-xs">({quickAction.time})</span>
              </button>
            )}
          </div>

          {/* Next Section / Actions */}
          <div className="flex items-center space-x-2">
            {/* Skip Button (for optional sections) */}
            {currentSection !== 'personal' && currentSection !== 'upload' && (
              <button
                onClick={handleSkip}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Skip
              </button>
            )}

            {/* Minimize Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            {/* Next Button */}
            {nextSection && (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                <span className="text-sm">{nextSection.label}</span>
                {nextSection.id === 'job-search' && (
                  <span className="text-xs bg-teal-700 px-2 py-1 rounded">Ready!</span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pb-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-teal-500 to-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${completeness.overall.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}