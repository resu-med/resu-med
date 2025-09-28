'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';
import ClinicalTreatmentPlan from '@/components/ClinicalTreatmentPlan';

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
      <ClinicalTreatmentPlan profile={profile} currentStep="diagnosis" />

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