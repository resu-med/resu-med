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
        <ResponsiveNavigation currentPage="profile" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clipRule="evenodd" />
                <path d="M9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                Profile Builder
              </h1>
              <p className="text-teal-600 font-medium">Professional Resume Treatment System</p>
            </div>
          </div>

          <p className="text-gray-600 text-lg max-w-3xl">
            Build a comprehensive professional profile with clinical precision. Each section contributes to your complete career diagnosis and treatment plan.
          </p>
        </div>

        {/* Dynamic Progress Banner */}
        <div className={`p-4 rounded-lg border ${
          completeness.overall.percentage >= 85 ? 'bg-green-50 border-green-200' :
          completeness.overall.percentage >= 75 ? 'bg-blue-50 border-blue-200' :
          completeness.overall.percentage >= 50 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {completeness.overall.percentage >= 85 ? '🏆' :
                 completeness.overall.percentage >= 75 ? '✅' :
                 completeness.overall.percentage >= 50 ? '⚠️' : '❌'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Profile Strength: {completeness.overall.percentage}%
                </h3>
                <p className={`text-sm ${
                  completeness.overall.percentage >= 85 ? 'text-green-700' :
                  completeness.overall.percentage >= 75 ? 'text-blue-700' :
                  completeness.overall.percentage >= 50 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {completeness.overall.percentage >= 85 ? 'Outstanding! Ready for premium features.' :
                   completeness.overall.percentage >= 75 ? 'Great! Ready for job searching.' :
                   completeness.overall.percentage >= 50 ? 'Good progress! Complete a few more sections.' :
                   'Profile needs attention to unlock features.'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {completeness.readyForJobs ? (
                <Link
                  href="/job-search"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  🔍 Search Jobs
                </Link>
              ) : null}
              {completeness.readyForTemplates ? (
                <Link
                  href="/templates"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  📄 Generate Resume
                </Link>
              ) : null}
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

          {/* Next Steps */}
          {completeness.nextSteps.length > 0 && completeness.overall.percentage < 85 && (
            <div className="mt-3 text-sm">
              <strong>Next steps:</strong> {completeness.nextSteps.slice(0, 2).join(', ')}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Enhanced Navigation Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-teal-100 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">Treatment Sections</h3>
              </div>
              <ul className="space-y-2">
                {sections.map((section) => {
                  const isCompleted = getCompletionStatus(section.id as ProfileSection);
                  return (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id as ProfileSection)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all ${
                          activeSection === section.id
                            ? 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 border border-teal-200 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{section.icon}</span>
                          <span className="font-medium">{section.label}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          isCompleted ? 'bg-green-500' :
                          activeSection === section.id ? 'bg-teal-500' : 'bg-gray-300'
                        }`}></div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Progress Summary */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-teal-100 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-semibold text-gray-900">Progress Overview</h3>
              </div>
              <div className="space-y-3">
                {sections.map((section) => {
                  const isCompleted = getCompletionStatus(section.id as ProfileSection);
                  return (
                    <div key={section.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center">
                        <span className="mr-2">{section.icon}</span>
                        {section.label}
                      </span>
                      <div className="flex items-center space-x-2">
                        {isCompleted ? (
                          <div className="flex items-center text-xs text-green-600 font-medium">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Complete
                          </div>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-medium text-teal-600">
                    {Math.round((sections.filter(section => getCompletionStatus(section.id as ProfileSection)).length / sections.length) * 100)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(sections.filter(section => getCompletionStatus(section.id as ProfileSection)).length / sections.length) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
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