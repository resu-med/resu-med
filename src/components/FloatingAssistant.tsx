'use client';

import { useState, useEffect } from 'react';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

interface FloatingAssistantProps {
  profile: any;
  currentSection: string;
  onNavigateToSection: (sectionId: string) => void;
  onQuickAction: (action: string) => void;
}

export default function FloatingAssistant({
  profile,
  currentSection,
  onNavigateToSection,
  onQuickAction
}: FloatingAssistantProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const completeness = calculateProfileCompleteness(profile);

  // Auto-hide if profile is complete
  useEffect(() => {
    if (completeness.overall.percentage >= 90) {
      setIsVisible(false);
    }
  }, [completeness.overall.percentage]);

  // Get next best action based on current context
  const getNextAction = () => {
    const highPriorityMissing = completeness.sections
      .filter(section => section.priority === 'high' && section.issues.length > 0)
      .sort((a, b) => a.score - b.score)[0];

    if (!highPriorityMissing) {
      // Look for medium priority
      const mediumPriorityMissing = completeness.sections
        .filter(section => section.priority === 'medium' && section.issues.length > 0)
        .sort((a, b) => a.score - b.score)[0];

      if (mediumPriorityMissing) {
        return {
          text: `Complete ${mediumPriorityMissing.name}`,
          subtext: mediumPriorityMissing.suggestions[0],
          action: () => onNavigateToSection(mediumPriorityMissing.id),
          type: 'navigate',
          icon: '📝',
          time: mediumPriorityMissing.estimatedTime
        };
      }

      // Profile is mostly complete
      if (completeness.readyForJobs) {
        return {
          text: 'Start Job Search',
          subtext: 'Your profile is ready for matching',
          action: () => window.location.href = '/job-search',
          type: 'navigate',
          icon: '🔍',
          time: ''
        };
      }

      return null;
    }

    // Quick actions for high priority items
    switch (highPriorityMissing.id) {
      case 'personal':
        if (highPriorityMissing.issues.includes('Missing Phone number')) {
          return {
            text: 'Add Phone Number',
            subtext: 'Unlock job search features',
            action: () => onQuickAction('quick-phone'),
            type: 'quick',
            icon: '📞',
            time: '30 sec'
          };
        }
        break;
      case 'experience':
        return {
          text: 'Add Work Experience',
          subtext: 'Show your professional background',
          action: () => onQuickAction('quick-job'),
          type: 'quick',
          icon: '💼',
          time: '2 min'
        };
      case 'skills':
        return {
          text: 'Add Skills',
          subtext: 'Improve job matching',
          action: () => onQuickAction('quick-skills'),
          type: 'quick',
          icon: '⚡',
          time: '1 min'
        };
      case 'education':
        return {
          text: 'Add Education',
          subtext: 'Complete your background',
          action: () => onQuickAction('quick-education'),
          type: 'quick',
          icon: '🎓',
          time: '1 min'
        };
    }

    // Fallback to navigation
    return {
      text: `Complete ${highPriorityMissing.name}`,
      subtext: highPriorityMissing.suggestions[0],
      action: () => onNavigateToSection(highPriorityMissing.id),
      type: 'navigate',
      icon: '📝',
      time: highPriorityMissing.estimatedTime
    };
  };

  const nextAction = getNextAction();

  if (!isVisible || !nextAction) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-teal-600 text-white p-3 rounded-full shadow-lg hover:bg-teal-700 transition-colors"
        >
          <span className="text-xl">{nextAction.icon}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-white rounded-lg shadow-xl border border-teal-200 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{nextAction.icon}</span>
            <h4 className="font-medium text-gray-900 text-sm">Next Step</h4>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ➖
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mb-3">
          <h5 className="font-medium text-gray-900 text-sm mb-1">{nextAction.text}</h5>
          <p className="text-xs text-gray-600">{nextAction.subtext}</p>
          {nextAction.time && (
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-xs text-teal-600">⏱️ {nextAction.time}</span>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Profile Progress</span>
            <span>{completeness.overall.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${completeness.overall.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={nextAction.action}
            className="flex-1 bg-teal-600 text-white py-2 px-3 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            {nextAction.type === 'quick' ? 'Quick Add' : 'Go to Section'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
          >
            Later
          </button>
        </div>

        {/* Tip */}
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
          💡 Complete {85 - completeness.overall.percentage}% more to unlock resume generation
        </div>
      </div>
    </div>
  );
}