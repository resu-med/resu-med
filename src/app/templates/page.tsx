'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';

interface JobAnalysis {
  keyRequirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  companyInfo: string;
  roleLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industryType: string;
  matchingScore: number;
  recommendations: string[];
}

interface GeneratedContent {
  resume: string;
  coverLetter: string;
  analysis: JobAnalysis;
}

function TemplatesPageContent() {
  const { state } = useProfile();
  const { state: authState, logout } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');

  const handleAnalyzeAndGenerate = async () => {
    if (!jobDescription.trim() || !jobTitle.trim()) {
      alert('Please fill in the job title and description');
      return;
    }

    if (!state.profile.personalInfo.firstName || !state.profile.experience.length) {
      alert('Please complete your profile first before generating tailored content');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-job-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          jobTitle,
          companyName,
          profile: state.profile
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data);
      } else {
        console.error('Failed to analyze job and generate content');
        alert('Failed to generate content. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const profileComplete = state.profile.personalInfo.firstName && state.profile.experience.length > 0;

  const handleCopyToClipboard = () => {
    const content = activeTab === 'resume' ? generatedContent.resume : generatedContent.coverLetter;
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const handleDownloadDocx = async () => {
    if (!generatedContent) return;

    const content = activeTab === 'resume' ? generatedContent.resume : generatedContent.coverLetter;
    const filename = activeTab === 'resume'
      ? `${state.profile.personalInfo.firstName}_${state.profile.personalInfo.lastName}_Resume.docx`
      : `${state.profile.personalInfo.firstName}_${state.profile.personalInfo.lastName}_Cover_Letter.docx`;

    try {
      const response = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type: activeTab,
          filename,
          profile: state.profile
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download DOCX');
        alert('Failed to download document. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('An error occurred while downloading. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="sticky top-0 z-50">
        <ResponsiveNavigation currentPage="templates" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                Smart Templates
              </h1>
              <p className="text-teal-600 font-medium">AI-Powered Resume & Cover Letter Generation</p>
            </div>
          </div>

          <p className="text-gray-600 text-lg max-w-4xl">
            Paste any job description and our AI will analyze it against your profile to create a perfectly tailored
            resume and cover letter that highlights your most relevant experience and skills.
          </p>
        </div>

        {/* Profile Status Warning */}
        {!profileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-yellow-800 font-semibold">Profile Incomplete</h3>
                <p className="text-yellow-700">
                  To generate tailored resumes and cover letters, please{' '}
                  <Link href="/profile" className="underline hover:no-underline">
                    complete your profile
                  </Link>{' '}
                  with your personal information and work experience.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Job Analysis & Template Generation</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Provide job details to generate perfectly matched resume and cover letter
                </p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., TechCorp Inc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
                placeholder="Paste the complete job description here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              />
              <p className="text-sm text-gray-500 mt-2">
                Include requirements, responsibilities, qualifications, and any company information
              </p>
            </div>

            <button
              onClick={handleAnalyzeAndGenerate}
              disabled={isAnalyzing || !profileComplete}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Analyzing & Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Templates</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Content */}
        {generatedContent && (
          <div className="space-y-8">
            {/* Job Analysis Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <h3 className="text-lg font-semibold text-gray-900">Job Analysis Results</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-teal-600 mb-1">
                      {generatedContent.analysis.matchingScore}%
                    </div>
                    <p className="text-sm text-gray-600">Profile Match</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {generatedContent.analysis.roleLevel}
                    </div>
                    <p className="text-sm text-gray-600">Role Level</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {generatedContent.analysis.industryType}
                    </div>
                    <p className="text-sm text-gray-600">Industry</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Key Requirements Matched</h4>
                    <ul className="space-y-1">
                      {generatedContent.analysis.keyRequirements.map((req, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">AI Recommendations</h4>
                    <ul className="space-y-1">
                      {generatedContent.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Templates */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Generated Templates</h3>
                  <div className="flex space-x-1 bg-white rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('resume')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'resume'
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => setActiveTab('cover-letter')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'cover-letter'
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Cover Letter
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-line text-gray-900">
                  {activeTab === 'resume' ? generatedContent.resume : generatedContent.coverLetter}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy to Clipboard</span>
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download as DOCX</span>
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Download as PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Job-Specific Matching</h3>
            <p className="text-gray-600 text-sm">
              AI analyzes job requirements and matches them with your experience and skills for maximum relevance
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Intelligent Optimization</h3>
            <p className="text-gray-600 text-sm">
              Automatically highlights your most relevant achievements and skills for each specific role
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dual Generation</h3>
            <p className="text-gray-600 text-sm">
              Creates both a tailored resume and personalized cover letter in one seamless process
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <RouteGuard requireAuth={true}>
      <TemplatesPageContent />
    </RouteGuard>
  );
}