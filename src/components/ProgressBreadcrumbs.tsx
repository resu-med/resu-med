'use client';

import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

interface ProgressBreadcrumbsProps {
  profile: any;
  currentSection: string;
  onNavigateToSection: (sectionId: string) => void;
}

export default function ProgressBreadcrumbs({
  profile,
  currentSection,
  onNavigateToSection
}: ProgressBreadcrumbsProps) {
  const completeness = calculateProfileCompleteness(profile);

  const steps = [
    {
      id: 'upload',
      label: 'Import',
      icon: '📋',
      description: 'Upload resume'
    },
    {
      id: 'build',
      label: 'Build Profile',
      icon: '🏗️',
      description: 'Complete sections',
      subSteps: ['personal', 'experience', 'education', 'skills']
    },
    {
      id: 'jobs',
      label: 'Find Jobs',
      icon: '🔍',
      description: 'Search & match',
      unlockAt: 75
    },
    {
      id: 'templates',
      label: 'Generate',
      icon: '📄',
      description: 'Create resume',
      unlockAt: 85
    }
  ];

  const getCurrentStepIndex = () => {
    if (completeness.overall.percentage >= 85) return 3;
    if (completeness.overall.percentage >= 75) return 2;
    if (completeness.overall.percentage > 20) return 1;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  const getStepStatus = (index: number, step: any) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    if (step.unlockAt && completeness.overall.percentage < step.unlockAt) return 'locked';
    return 'upcoming';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 border-green-500 text-white';
      case 'current': return 'bg-teal-500 border-teal-500 text-white';
      case 'locked': return 'bg-gray-300 border-gray-300 text-gray-500';
      case 'upcoming': return 'bg-white border-gray-300 text-gray-600';
      default: return 'bg-white border-gray-300 text-gray-600';
    }
  };

  const getConnectorColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'current': return 'bg-teal-500';
      default: return 'bg-gray-300';
    }
  };

  const handleStepClick = (step: any, status: string) => {
    if (status === 'locked') return;

    switch (step.id) {
      case 'upload':
        onNavigateToSection('upload');
        break;
      case 'build':
        // Find the most important incomplete section
        const incompleteSection = completeness.sections
          .filter(section => section.issues.length > 0)
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.score - b.score;
          })[0];

        if (incompleteSection) {
          onNavigateToSection(incompleteSection.id);
        } else {
          onNavigateToSection('personal');
        }
        break;
      case 'jobs':
        if (completeness.readyForJobs) {
          window.location.href = '/job-search';
        }
        break;
      case 'templates':
        if (completeness.readyForTemplates) {
          window.location.href = '/templates';
        }
        break;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Progress Steps */}
          <div className="flex items-center space-x-1 md:space-x-4">
            {steps.map((step, index) => {
              const status = getStepStatus(index, step);
              const isClickable = status !== 'locked';

              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(step, status)}
                    disabled={!isClickable}
                    className={`relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all ${
                      getStepColor(status)
                    } ${isClickable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <span className="text-sm md:text-base">{step.icon}</span>

                    {/* Status Indicator */}
                    {status === 'completed' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    {status === 'current' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
                    )}
                    {status === 'locked' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🔒</span>
                      </div>
                    )}
                  </button>

                  {/* Step Label */}
                  <div className="ml-2 md:ml-3 min-w-0">
                    <div className={`text-xs md:text-sm font-medium ${
                      status === 'current' ? 'text-teal-700' :
                      status === 'completed' ? 'text-green-700' :
                      status === 'locked' ? 'text-gray-400' :
                      'text-gray-600'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500 hidden md:block">
                      {step.description}
                      {step.unlockAt && status === 'locked' && (
                        <span className="ml-1">({step.unlockAt}%+)</span>
                      )}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`mx-2 md:mx-4 h-0.5 w-6 md:w-12 ${
                      getConnectorColor(index < currentStepIndex ? 'completed' : 'upcoming')
                    }`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall Progress */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {completeness.overall.percentage}% Complete
              </div>
              <div className="text-xs text-gray-500">
                {completeness.readyForTemplates ? 'Ready for all features' :
                 completeness.readyForJobs ? 'Ready for job search' :
                 'Building profile...'}
              </div>
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  completeness.overall.percentage >= 85 ? 'bg-green-500' :
                  completeness.overall.percentage >= 75 ? 'bg-teal-500' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(completeness.overall.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="md:hidden mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completeness.overall.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                completeness.overall.percentage >= 85 ? 'bg-green-500' :
                completeness.overall.percentage >= 75 ? 'bg-teal-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(completeness.overall.percentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}