'use client';

import { useRouter } from 'next/navigation';
import { calculateProfileCompleteness } from '@/lib/profileCompleteness';

interface ClinicalTreatmentPlanProps {
  profile: any;
  currentStep?: 'diagnosis' | 'treatment' | 'recovery';
}

export default function ClinicalTreatmentPlan({
  profile,
  currentStep = 'diagnosis'
}: ClinicalTreatmentPlanProps) {
  const router = useRouter();
  const completeness = calculateProfileCompleteness(profile);

  const handleStepClick = (step: string) => {
    switch (step) {
      case 'diagnosis':
        router.push('/profile');
        break;
      case 'treatment':
        if (completeness.overall.percentage >= 75) {
          router.push('/job-search');
        }
        break;
      case 'recovery':
        if (completeness.readyForTemplates) {
          router.push('/templates');
        }
        break;
    }
  };

  const getStepStatus = (step: string) => {
    switch (step) {
      case 'diagnosis':
        return {
          isActive: currentStep === 'diagnosis',
          isCompleted: completeness.overall.percentage >= 75,
          isUnlocked: true
        };
      case 'treatment':
        return {
          isActive: currentStep === 'treatment',
          isCompleted: false, // Could add logic for completed job applications
          isUnlocked: completeness.overall.percentage >= 75
        };
      case 'recovery':
        return {
          isActive: currentStep === 'recovery',
          isCompleted: false, // Could add logic for generated documents
          isUnlocked: completeness.readyForTemplates
        };
      default:
        return { isActive: false, isCompleted: false, isUnlocked: false };
    }
  };

  const getStepClassName = (step: string) => {
    const status = getStepStatus(step);

    if (status.isActive) {
      return 'bg-white text-teal-600 border-white shadow-xl transform scale-105';
    } else if (status.isCompleted) {
      return 'bg-white/20 backdrop-blur border-white/50 text-white hover:bg-white/30 cursor-pointer';
    } else if (status.isUnlocked) {
      return 'bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 cursor-pointer';
    } else {
      return 'bg-white/5 backdrop-blur border-white/20 text-white/60 cursor-not-allowed';
    }
  };

  return (
    <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold mb-2">🩺 Your Career Health Treatment Plan</h2>
          <p className="text-teal-100">Follow our proven 3-step clinical approach to career success</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Diagnosis */}
          <div
            onClick={() => handleStepClick('diagnosis')}
            className={`rounded-lg p-4 border-2 transition-all ${getStepClassName('diagnosis')}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🔍</span>
              <div>
                <h3 className="font-semibold">Step 1: Diagnosis</h3>
                <p className="text-sm opacity-80">Build Complete Profile</p>
              </div>
            </div>
            <div className="text-xs opacity-80">
              Upload resume, complete all sections, optimize your professional profile
            </div>
            {getStepStatus('diagnosis').isCompleted && (
              <div className="mt-2 flex items-center text-green-300">
                <span className="text-sm">✓ Diagnosis Complete</span>
              </div>
            )}
            {currentStep === 'diagnosis' && (
              <div className="mt-2 flex items-center text-teal-600 font-medium">
                <span className="text-sm">👈 You are here</span>
              </div>
            )}
          </div>

          {/* Step 2: Treatment */}
          <div
            onClick={() => handleStepClick('treatment')}
            className={`rounded-lg p-4 border-2 transition-all ${getStepClassName('treatment')}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">💼</span>
              <div>
                <h3 className="font-semibold">Step 2: Treatment</h3>
                <p className="text-sm opacity-80">Search & Apply for Jobs</p>
              </div>
            </div>
            <div className="text-xs opacity-80">
              Smart job matching, targeted applications, track your progress
            </div>
            {!getStepStatus('treatment').isUnlocked && (
              <div className="mt-2 text-yellow-300 text-xs">
                🔒 Unlocks at 75% profile completion
              </div>
            )}
            {currentStep === 'treatment' && (
              <div className="mt-2 flex items-center text-teal-600 font-medium">
                <span className="text-sm">👈 You are here</span>
              </div>
            )}
          </div>

          {/* Step 3: Recovery */}
          <div
            onClick={() => handleStepClick('recovery')}
            className={`rounded-lg p-4 border-2 transition-all ${getStepClassName('recovery')}`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-semibold">Step 3: Recovery</h3>
                <p className="text-sm opacity-80">Generate Tailored Documents</p>
              </div>
            </div>
            <div className="text-xs opacity-80">
              Custom resumes, cover letters, optimized for each application
            </div>
            {!getStepStatus('recovery').isUnlocked && (
              <div className="mt-2 text-yellow-300 text-xs">
                🔒 Unlocks at 85% profile completion
              </div>
            )}
            {currentStep === 'recovery' && (
              <div className="mt-2 flex items-center text-teal-600 font-medium">
                <span className="text-sm">👈 You are here</span>
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

          {/* Missing Items Breakdown */}
          {completeness.overall.percentage < 100 && (
            <div className="mt-4 text-left">
              <div className="text-sm font-semibold mb-2 text-white/90">
                🎯 To reach 100% health score:
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-xs">
                {completeness.sections
                  .filter(section => section.status !== 'complete' || section.suggestions.length > 0)
                  .map((section, index) => (
                    <div key={section.id} className="mb-2 last:mb-0">
                      <div className="font-medium text-white/90 mb-1">
                        {section.name} ({section.score}/{section.maxScore} points)
                      </div>
                      <div className="text-white/70 ml-2">
                        {section.issues.length > 0 && (
                          <div className="mb-1">
                            ❌ {section.issues.slice(0, 2).join(', ')}
                          </div>
                        )}
                        {section.suggestions.length > 0 && (
                          <div>
                            💡 {section.suggestions.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                <div className="mt-2 pt-2 border-t border-white/20 text-white/80 text-center">
                  Complete these items to unlock full functionality!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}