'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import PersonalInfoForm from '@/components/forms/PersonalInfoForm';
import ExperienceForm from '@/components/forms/ExperienceForm';
import EducationForm from '@/components/forms/EducationForm';
import SkillsForm from '@/components/forms/SkillsForm';
import InterestsForm from '@/components/forms/InterestsForm';
import ResumeUpload from '@/components/forms/ResumeUpload';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';
import InlineProgressCard from '@/components/InlineProgressCard';
import QuickActionModals from '@/components/QuickActionModals';
import FloatingAssistant from '@/components/FloatingAssistant';
type ProfileSection = 'upload' | 'personal' | 'experience' | 'education' | 'skills' | 'interests';

type SectionConfig = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
};

function ProfilePageContent() {
  const [activeSection, setActiveSection] = useState<ProfileSection>('upload');
  const { state, dispatch } = useProfile();
  const { state: authState, logout } = useAuth();
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  // Calculate profile completeness
  const completeness = calculateProfileCompleteness(state.profile);


  // Function to check completion status of each section
  const getCompletionStatus = (section: ProfileSection): boolean => {
    switch (section) {
      case 'upload':
        // Consider upload complete if there's meaningful data in the profile
        return !!(state.profile.personalInfo.firstName ||
                 state.profile.experience.length > 0 ||
                 state.profile.education.length > 0 ||
                 state.profile.skills.length > 0);
      case 'personal':
        const personal = state.profile.personalInfo;
        return !!(personal.firstName && personal.lastName && personal.email);
      case 'experience':
        return state.profile.experience.length > 0;
      case 'education':
        return state.profile.education.length > 0;
      case 'skills':
        return state.profile.skills.length > 0;
      case 'interests':
        return state.profile.interests.length > 0;
      default:
        return false;
    }
  };

  const sections: readonly SectionConfig[] = [
    { id: 'upload', label: 'Import Resume', icon: '📋', description: 'Upload and analyze your existing resume' },
    { id: 'personal', label: 'Patient Details', icon: '🩺', description: 'Basic personal and contact information' },
    { id: 'experience', label: 'Work History', icon: '💊', description: 'Professional experience and achievements' },
    { id: 'education', label: 'Qualifications', icon: '🎓', description: 'Educational background and certifications' },
    { id: 'skills', label: 'Competencies', icon: '⚡', description: 'Technical and professional skills' },
    { id: 'interests', label: 'Interests', icon: '🌟', description: 'Personal interests and activities' },
  ] as const;

  const handleNavigateToSection = (sectionId: string) => {
    setActiveSection(sectionId as ProfileSection);
  };

  const handleQuickAction = (action: string) => {
    setActiveQuickAction(action);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'upload':
        return <ResumeUpload key="upload" />;
      case 'personal':
        return <PersonalInfoForm key={`personal-${state.profile.personalInfo.firstName}-${state.profile.personalInfo.lastName}`} />;
      case 'experience':
        return <ExperienceForm key="experience" />;
      case 'education':
        return <EducationForm key="education" />;
      case 'skills':
        return <SkillsForm key="skills" />;
      case 'interests':
        return <InterestsForm key="interests" />;
      default:
        return <ResumeUpload key="upload-default" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50">
        <ResponsiveNavigation
          currentPage="profile"
          currentSection={activeSection}
          onNavigateToSection={handleNavigateToSection}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Inline Progress Card */}
        <InlineProgressCard
          profile={state.profile}
          onNavigateToSection={handleNavigateToSection}
          onQuickAction={handleQuickAction}
        />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Consolidated Profile Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-teal-100 p-6">
              {/* Header with Overall Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mr-2"></div>
                    Profile Sections
                  </h3>
                  <span className="text-sm font-medium text-teal-600">
                    {Math.round((sections.filter(section => getCompletionStatus(section.id as ProfileSection)).length / sections.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(sections.filter(section => getCompletionStatus(section.id as ProfileSection)).length / sections.length) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Actionable Section List */}
              <ul className="space-y-2">
                {sections.map((section) => {
                  const isCompleted = getCompletionStatus(section.id as ProfileSection);
                  const sectionCompleteness = completeness.sections.find(s => s.id === section.id);
                  const hasIssues = sectionCompleteness?.issues.length > 0;

                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id as ProfileSection)}
                        className={`w-full text-left rounded-lg transition-all p-3 ${
                          activeSection === section.id
                            ? 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 border border-teal-200 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">{section.icon}</span>
                            <div>
                              <span className="font-medium block">{section.label}</span>
                              {hasIssues && !isCompleted && (
                                <span className="text-xs text-gray-500">
                                  {sectionCompleteness.issues[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <div className="flex items-center text-xs text-green-600 font-medium">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">Complete</span>
                              </div>
                            ) : hasIssues ? (
                              <div className="text-xs text-amber-600 font-medium">
                                {sectionCompleteness.estimatedTime}
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Quick Actions for Incomplete Items */}
              {completeness.overall.percentage < 100 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    {completeness.sections
                      .filter(section => section.priority === 'high' && section.issues.length > 0)
                      .slice(0, 2)
                      .map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id as ProfileSection)}
                          className="w-full text-left p-2 rounded border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors"
                        >
                          <div className="text-sm font-medium text-teal-800">{section.name}</div>
                          <div className="text-xs text-teal-600">{section.suggestions[0]}</div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Enhanced Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {sections.find(s => s.id === activeSection)?.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {sections.find(s => s.id === activeSection)?.label}
                    </h2>
                    <p className="text-sm text-gray-600 mb-1">
                      {sections.find(s => s.id === activeSection)?.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-teal-600">
                        {getCompletionStatus(activeSection) ? '✅ Complete' : '⏳ In Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                {renderSection()}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Assistant */}
        <FloatingAssistant
          profile={state.profile}
          currentSection={activeSection}
          onNavigateToSection={handleNavigateToSection}
          onQuickAction={handleQuickAction}
        />

        {/* Quick Action Modals */}
        <QuickActionModals
          activeAction={activeQuickAction}
          onClose={() => setActiveQuickAction(null)}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RouteGuard requireAuth={true}>
      <ProfilePageContent />
    </RouteGuard>
  );
}