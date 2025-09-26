'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProfile } from '@/contexts/ProfileContext';
import { FileParser } from '@/lib/fileParser';
import { SmartResumeParser } from '@/lib/smartResumeParser';

export default function ResumeUpload() {
  const { dispatch } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

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
      // Parse the file content
      const text = await FileParser.parseFile(file);

      if (!text || text.trim().length < 50) {
        setUploadStatus({
          type: 'error',
          message: 'Could not extract enough text from the resume. Please try a different file or format.'
        });
        return;
      }

      // Parse the resume data using AI-powered SmartResumeParser
      setUploadStatus({ type: 'info', message: 'Using advanced AI to analyze your resume...' });
      const parsedData = await SmartResumeParser.parseResume(text);

      console.log('🎯 PARSED DATA STRUCTURE:', parsedData);
      console.log('🎯 EXPERIENCE DATA:', parsedData.experience);
      console.log('🎯 EXPERIENCE LENGTH:', parsedData.experience?.length);

      // Update the profile with parsed data
      if (parsedData.personalInfo) {
        console.log('📝 Dispatching personal info:', parsedData.personalInfo);
        dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: parsedData.personalInfo });
      }

      if (parsedData.experience && parsedData.experience.length > 0) {
        console.log('💼 Dispatching', parsedData.experience.length, 'experiences');
        parsedData.experience.forEach((exp, index) => {
          console.log(`Experience ${index + 1} structure:`, {
            id: exp.id,
            company: exp.company,
            position: exp.position,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.current,
            description: exp.description?.substring(0, 50) + '...',
            achievements: exp.achievements?.length || 0
          });
          console.log('🚀 About to dispatch ADD_EXPERIENCE for:', exp.company, '-', exp.position);
          dispatch({ type: 'ADD_EXPERIENCE', payload: exp });
          console.log('✅ Dispatched ADD_EXPERIENCE');
        });
        console.log('🏁 Finished dispatching all experiences');
      } else {
        console.log('❌ No experience data found or empty array');
        console.log('❌ parsedData.experience type:', typeof parsedData.experience);
        console.log('❌ parsedData.experience:', parsedData.experience);
      }

      if (parsedData.education && parsedData.education.length > 0) {
        console.log('🎓 Dispatching', parsedData.education.length, 'education entries');
        parsedData.education.forEach((edu, index) => {
          console.log(`Education ${index + 1}:`, {
            degree: edu.degree,
            institution: edu.institution,
            field: edu.field,
            location: edu.location,
            startDate: edu.startDate,
            endDate: edu.endDate,
            gpa: edu.gpa
          });
          dispatch({ type: 'ADD_EDUCATION', payload: edu });
        });
      } else {
        console.log('❌ No education data found');
        console.log('❌ parsedData.education:', parsedData.education);
      }

      if (parsedData.skills && parsedData.skills.length > 0) {
        console.log('🔧 Dispatching', parsedData.skills.length, 'skills');
        parsedData.skills.forEach((skill, index) => {
          console.log(`Skill ${index + 1}:`, {
            name: skill.name,
            category: skill.category,
            level: skill.level
          });
          dispatch({ type: 'ADD_SKILL', payload: skill });
        });
      } else {
        console.log('❌ No skills data found');
        console.log('❌ parsedData.skills:', parsedData.skills);
      }

      if (parsedData.interests && parsedData.interests.length > 0) {
        console.log('🌟 Dispatching', parsedData.interests.length, 'interests');
        parsedData.interests.forEach((interest, index) => {
          console.log(`Interest ${index + 1}:`, {
            name: interest.name,
            category: interest.category,
            description: interest.description
          });
          dispatch({ type: 'ADD_INTEREST', payload: interest });
        });
      } else {
        console.log('❌ No interests data found');
        console.log('❌ parsedData.interests:', parsedData.interests);
      }

      const sections = [];
      if (parsedData.personalInfo?.firstName) sections.push('personal information');
      if (parsedData.experience?.length) sections.push(`${parsedData.experience.length} work experience${parsedData.experience.length > 1 ? 's' : ''}`);
      if (parsedData.education?.length) sections.push(`${parsedData.education.length} education entr${parsedData.education.length > 1 ? 'ies' : 'y'}`);
      if (parsedData.skills?.length) sections.push(`${parsedData.skills.length} skills`);
      if (parsedData.interests?.length) sections.push(`${parsedData.interests.length} interests`);

      const message = sections.length > 0
        ? `Successfully imported: ${sections.join(', ')}. Please review and edit as needed.`
        : 'Resume uploaded but no structured data was found. You may need to manually enter your information.';

      setUploadStatus({ type: 'success', message });
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

    </div>
  );
}