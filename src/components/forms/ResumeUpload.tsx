'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProfile } from '@/contexts/ProfileContext';
import { FileParser } from '@/lib/fileParser';
import { SmartResumeParser } from '@/lib/smartResumeParser';
import ProfileHealthCheck from '@/components/ProfileHealthCheck';

export default function ResumeUpload() {
  const { state: profileState, dispatch } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    const validation = FileParser.validateFile(file);
    if (!validation.valid) {
      setUploadStatus({ type: 'error', message: validation.error || 'Invalid file' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'info', message: 'Parsing your resume...' });

    try {
      // Parse the file content using the enhanced API
      setUploadStatus({ type: 'info', message: 'Extracting text from your resume...' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume');
      }

      const { text, parsedData } = await response.json();

      if (!text || text.trim().length < 50) {
        setUploadStatus({
          type: 'error',
          message: 'Could not extract enough text from the resume. Please try a different file or format.'
        });
        return;
      }

      setUploadStatus({ type: 'info', message: 'AI analysis complete!' });

      console.log('🎯 PARSED DATA STRUCTURE:', parsedData);
      console.log('🎯 EXPERIENCE DATA:', parsedData.experience);
      console.log('🎯 EXPERIENCE LENGTH:', parsedData.experience?.length);

      // Update the profile with parsed data
      if (parsedData) {
        console.log('🤖 Using AI-parsed data');

        if (parsedData.personalInfo) {
          console.log('📝 Dispatching personal info:', parsedData.personalInfo);
          dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: parsedData.personalInfo });
        }

        if (parsedData.experience && parsedData.experience.length > 0) {
          console.log('💼 Dispatching', parsedData.experience.length, 'experiences');

          // Transform AI data to match profile structure
          const transformedExperience = parsedData.experience.map((exp: any, index: number) => ({
            id: `exp-${Date.now()}-${index}`,
            company: exp.company || '',
            jobTitle: exp.jobTitle || '',
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current || false,
            description: exp.description || '',
            achievements: Array.isArray(exp.achievements) ? exp.achievements : []
          }));

          // Sort experience by most recent first (current roles first, then by start date)
          const sortedExperience = [...transformedExperience].sort((a, b) => {
            // Current roles first
            if (a.current && !b.current) return -1;
            if (!a.current && b.current) return 1;

            // Then sort by start date (most recent first)
            const dateA = new Date(a.startDate || '1900-01-01');
            const dateB = new Date(b.startDate || '1900-01-01');
            return dateB.getTime() - dateA.getTime();
          });

          console.log('📅 Sorted experience by date (most recent first):');
          sortedExperience.forEach((exp: any, index: number) => {
            console.log(`${index + 1}. ${exp.company} - ${exp.jobTitle} (${exp.startDate} to ${exp.current ? 'Present' : exp.endDate})`);
          });

          sortedExperience.forEach((exp: any) => {
            console.log('🚀 Dispatching experience:', exp.company, '-', exp.jobTitle);
            dispatch({ type: 'ADD_EXPERIENCE', payload: exp });
          });
          console.log('🏁 Finished dispatching all experiences in chronological order');
        } else {
          console.log('❌ No experience data found or empty array');
        }

        if (parsedData.education && parsedData.education.length > 0) {
          console.log('🎓 Dispatching', parsedData.education.length, 'education entries');

          // Transform AI data to match profile structure
          const transformedEducation = parsedData.education.map((edu: any, index: number) => ({
            id: `edu-${Date.now()}-${index}`,
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            location: edu.location || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            current: edu.current || false,
            gpa: edu.gpa || '',
            achievements: Array.isArray(edu.achievements) ? edu.achievements : []
          }));

          transformedEducation.forEach((edu: any) => {
            console.log('🚀 Dispatching education:', edu.institution, '-', edu.degree);
            dispatch({ type: 'ADD_EDUCATION', payload: edu });
          });
        } else {
          console.log('❌ No education data found');
        }

        if (parsedData.skills && parsedData.skills.length > 0) {
          console.log('⚡ Dispatching', parsedData.skills.length, 'skills');

          // Transform AI data to match profile structure
          const transformedSkills = parsedData.skills.map((skill: any, index: number) => {
            // Normalize category to lowercase valid values
            let category = (skill.category || 'other').toLowerCase();
            if (!['technical', 'soft', 'language', 'other'].includes(category)) {
              // Map common variations
              if (category.includes('technical') || category.includes('programming')) category = 'technical';
              else if (category.includes('soft') || category.includes('professional')) category = 'soft';
              else if (category.includes('language')) category = 'language';
              else category = 'other';
            }

            return {
              id: `skill-${Date.now()}-${index}`,
              name: skill.name || '',
              level: ['beginner', 'intermediate', 'advanced', 'expert'].includes(skill.level) ? skill.level : 'intermediate',
              category: category
            };
          });

          transformedSkills.forEach((skill: any) => {
            console.log('🚀 Dispatching skill:', skill.name);
            dispatch({ type: 'ADD_SKILL', payload: skill });
          });
        }

        if (parsedData.interests && parsedData.interests.length > 0) {
          console.log('🌟 Dispatching', parsedData.interests.length, 'interests');

          const transformedInterests = parsedData.interests.map((interest: string | any, index: number) => {
            // Handle both string and object formats
            const interestName = typeof interest === 'string' ? interest : interest.name || '';
            let category = typeof interest === 'object' ? interest.category : 'hobby';

            // Normalize category to valid values
            if (!['hobby', 'volunteer', 'interest', 'other'].includes(category)) {
              category = 'hobby'; // Default fallback
            }

            return {
              id: `interest-${Date.now()}-${index}`,
              name: interestName,
              category: category,
              description: typeof interest === 'object' ? interest.description || '' : ''
            };
          });

          transformedInterests.forEach((interest: any) => {
            console.log('🚀 Dispatching interest:', interest.name);
            dispatch({ type: 'ADD_INTEREST', payload: interest });
          });
        }
      } else {
        console.log('❌ No AI-parsed data available, using fallback parser...');
        // Could add fallback logic here if needed
      }

      const sections = [];
      if (parsedData.personalInfo?.firstName) sections.push('personal information');
      if (parsedData.experience?.length) sections.push(`${parsedData.experience.length} work experience${parsedData.experience.length > 1 ? 's' : ''}`);
      if (parsedData.education?.length) sections.push(`${parsedData.education.length} education entr${parsedData.education.length > 1 ? 'ies' : 'y'}`);
      if (parsedData.skills?.length) sections.push(`${parsedData.skills.length} skills`);
      if (parsedData.interests?.length) sections.push(`${parsedData.interests.length} interests`);

      const message = sections.length > 0
        ? `Successfully imported: ${sections.join(', ')}. Checking profile completeness...`
        : 'Resume uploaded but no structured data was found. You may need to manually enter your information.';

      setUploadStatus({ type: 'success', message });

      // Store parsed data for potential future use
      // Note: Health check is now handled by InlineProgressCard, not modal
      if (sections.length > 0) {
        setParsedData(parsedData);
        // Removed automatic modal popup - using inline progress card instead
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse resume. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading
  });

  const clearStatus = () => {
    setUploadStatus({ type: null, message: '' });
  };

  const handleHealthCheckClose = () => {
    setShowHealthCheck(false);
  };

  const handleNavigateToSection = (sectionId: string) => {
    // This will be handled by the parent component (ProfilePage)
    // For now, just close the modal
    setShowHealthCheck(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Import from Resume</h3>
        {uploadStatus.message && (
          <button
            onClick={clearStatus}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {uploadStatus.message && (
        <div className={`p-3 rounded-md ${
          uploadStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          uploadStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <p className="text-sm">{uploadStatus.message}</p>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="space-y-2">
          {isUploading ? (
            <>
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600">Processing your resume...</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">📄</div>
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Drop your resume here...</p>
              ) : (
                <>
                  <p className="text-gray-900 font-medium">
                    Drag & drop your resume here, or click to browse
                  </p>
                  <p className="text-gray-500 text-sm">
                    Supports PDF, DOCX, and TXT files (max 10MB)
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">🤖 AI-Powered Resume Analysis</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload your existing resume in PDF, DOCX, or TXT format</li>
          <li>• Our advanced AI intelligently analyzes any resume format</li>
          <li>• Automatically extracts personal info, experience, education, skills, and interests</li>
          <li>• Adapts to different resume structures and layouts</li>
          <li>• Review and edit the imported information in each section</li>
        </ul>
      </div>

      <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
        <h4 className="font-medium text-teal-900 mb-2">📋 Important Notes</h4>
        <ul className="text-sm text-teal-800 space-y-1">
          <li>• ✅ <strong>Full PDF support</strong> - Upload PDFs directly with intelligent text extraction</li>
          <li>• Always review imported data for accuracy after upload</li>
          <li>• Your uploaded file is processed securely and not stored</li>
          <li>• Supports complex resume formats with AI-powered analysis</li>
        </ul>
      </div>

      {/* Profile Health Check Modal */}
      <ProfileHealthCheck
        profile={profileState.profile}
        isOpen={showHealthCheck}
        onClose={handleHealthCheckClose}
        onNavigateToSection={handleNavigateToSection}
      />
    </div>
  );
}