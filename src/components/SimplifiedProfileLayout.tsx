'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

interface SimplifiedProfileLayoutProps {
  currentSection: string;
  onNavigateToSection: (sectionId: string) => void;
  onQuickAction?: (action: string) => void;
  profile: any;
  children: React.ReactNode;
}

export default function SimplifiedProfileLayout({
  currentSection,
  onNavigateToSection,
  onQuickAction,
  profile,
  children
}: SimplifiedProfileLayoutProps) {
  const router = useRouter();
  const completeness = calculateProfileCompleteness(profile);

  const sections = [
    { id: 'upload', label: 'Import', icon: '📋' },
    { id: 'personal', label: 'Details', icon: '🩺' },
    { id: 'experience', label: 'Work', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
    { id: 'interests', label: 'Interests', icon: '🌟' }
  ];

  const currentIndex = sections.findIndex(s => s.id === currentSection);
  const progress = Math.round((currentIndex + 1) / sections.length * 100);

  // Get primary action for current section
  const getPrimaryAction = () => {
    const sectionData = completeness.sections.find(s => s.id === currentSection);
    if (!sectionData?.issues.length) return null;

    switch (currentSection) {
      case 'personal':
        if (sectionData.issues.includes('Missing Phone number')) {
          return { text: 'Add Phone', action: 'quick-phone', urgent: true };
        }
        return { text: 'Complete Details', action: 'navigate', urgent: false };
      case 'experience':
        return { text: 'Add Work Experience', action: 'quick-job', urgent: true };
      case 'skills':
        return { text: 'Add Skills', action: 'quick-skills', urgent: true };
      case 'education':
        return { text: 'Add Education', action: 'quick-education', urgent: false };
      default:
        return null;
    }
  };

  const primaryAction = getPrimaryAction();

  const handleNext = () => {
    if (currentIndex < sections.length - 1) {
      onNavigateToSection(sections[currentIndex + 1].id);
    } else if (completeness.readyForJobs) {
      router.push('/job-search');
    }
  };

  const handlePrimaryAction = () => {
    if (primaryAction?.action === 'navigate') {
      // Just highlight the issue, let user handle it
      return;
    } else if (primaryAction?.action && onQuickAction) {
      onQuickAction(primaryAction.action);
    }
  };

  const canProceed = currentIndex === sections.length - 1 ? completeness.readyForJobs : true;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clinical Treatment Plan Overview */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold mb-2">🩺 Your Career Health Treatment Plan</h2>
            <p className="text-teal-100">Follow our proven 3-step clinical approach to career success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Diagnosis */}
            <div className={`bg-white/10 backdrop-blur rounded-lg p-4 border-2 transition-all ${
              completeness.overall.percentage < 75 ? 'border-white shadow-lg' : 'border-white/30'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🔍</span>
                <div>
                  <h3 className="font-semibold">Step 1: Diagnosis</h3>
                  <p className="text-sm text-teal-100">Build Complete Profile</p>
                </div>
              </div>
              <div className="text-xs text-teal-100">
                Upload resume, complete all sections, optimize your professional profile
              </div>
              {completeness.overall.percentage >= 75 && (
                <div className="mt-2 flex items-center text-green-300">
                  <span className="text-sm">✓ Diagnosis Complete</span>
                </div>
              )}
            </div>

            {/* Step 2: Treatment */}
            <div className={`bg-white/10 backdrop-blur rounded-lg p-4 border-2 transition-all ${
              completeness.overall.percentage >= 75 && completeness.overall.percentage < 100 ? 'border-white shadow-lg' : 'border-white/30'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">💼</span>
                <div>
                  <h3 className="font-semibold">Step 2: Treatment</h3>
                  <p className="text-sm text-teal-100">Search & Apply for Jobs</p>
                </div>
              </div>
              <div className="text-xs text-teal-100">
                Smart job matching, targeted applications, track your progress
              </div>
              {completeness.overall.percentage < 75 && (
                <div className="mt-2 text-yellow-300 text-xs">
                  🔒 Unlocks at 75% profile completion
                </div>
              )}
            </div>

            {/* Step 3: Recovery */}
            <div className={`bg-white/10 backdrop-blur rounded-lg p-4 border-2 transition-all ${
              completeness.readyForTemplates ? 'border-white shadow-lg' : 'border-white/30'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-semibold">Step 3: Recovery</h3>
                  <p className="text-sm text-teal-100">Generate Tailored Documents</p>
                </div>
              </div>
              <div className="text-xs text-teal-100">
                Custom resumes, cover letters, optimized for each application
              </div>
              {!completeness.readyForTemplates && (
                <div className="mt-2 text-yellow-300 text-xs">
                  🔒 Unlocks at 85% profile completion
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 text-center">
            <div className="text-sm mb-2">
              Overall Health Score: <span className="font-bold">{completeness.overall.percentage}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${completeness.overall.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Progress Steps - Larger and More Prominent */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => onNavigateToSection(section.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    currentSection === section.id
                      ? 'bg-teal-600 text-white shadow-lg scale-105'
                      : index <= currentIndex
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="hidden md:inline">{section.label}</span>
                  {index <= currentIndex && currentSection !== section.id && (
                    <span className="text-sm bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-gray-600">
              {completeness.overall.percentage}% Complete
            </div>
          </div>

          {/* Current Section Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              {sections.find(s => s.id === currentSection)?.label}
            </h1>

            {/* Primary Action - Only One */}
            {primaryAction && (
              <button
                onClick={handlePrimaryAction}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  primaryAction.urgent
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {primaryAction.text}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Clean */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {children}
        </div>
      </div>

      {/* Simplified Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => currentIndex > 0 && onNavigateToSection(sections[currentIndex - 1].id)}
            disabled={currentIndex === 0}
            className="flex items-center space-x-1 px-4 py-2 text-gray-600 disabled:text-gray-300 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          {/* Progress Bar */}
          <div className="flex-1 mx-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completeness.overall.percentage}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed && currentIndex === sections.length - 1}
            className="flex items-center space-x-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
          >
            <span>
              {currentIndex === sections.length - 1
                ? (completeness.readyForJobs ? 'Find Jobs' : 'Finish Profile')
                : 'Next'
              }
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}