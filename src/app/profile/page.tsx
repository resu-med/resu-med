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
import SimplifiedProfileLayout from '@/components/SimplifiedProfileLayout';
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
    <div>
      {/* Keep main navigation */}
      <ResponsiveNavigation
        currentPage="profile"
        currentSection={activeSection}
        onNavigateToSection={handleNavigateToSection}
      />

      {/* Simplified Layout */}
      <SimplifiedProfileLayout
        currentSection={activeSection}
        onNavigateToSection={handleNavigateToSection}
        onQuickAction={handleQuickAction}
        profile={state.profile}
      >
        {renderSection()}
      </SimplifiedProfileLayout>

      {/* Quick Action Modals */}
      <QuickActionModals
        activeAction={activeQuickAction}
        onClose={() => setActiveQuickAction(null)}
      />
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