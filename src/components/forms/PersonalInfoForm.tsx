'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function PersonalInfoForm() {
  const { state, dispatch } = useProfile();
  const { state: authState } = useAuth();
  const { personalInfo } = state.profile;

  // Track whether social links section is shown
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  // Track whether professional overview section is shown
  const [showProfessionalOverview, setShowProfessionalOverview] = useState(false);
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);

  // Simple local state that mirrors the Redux state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    professionalOverview: '',
  });

  // Update local form data when Redux state changes
  useEffect(() => {
    setFormData({
      firstName: personalInfo.firstName || '',
      lastName: personalInfo.lastName || '',
      email: personalInfo.email || '',
      phone: personalInfo.phone || '',
      location: personalInfo.location || '',
      website: personalInfo.website || '',
      linkedin: personalInfo.linkedin || '',
      github: personalInfo.github || '',
      professionalOverview: personalInfo.professionalOverview || '',
    });

    // Show social links if any of them have values
    if (personalInfo.website || personalInfo.linkedin || personalInfo.github) {
      setShowSocialLinks(true);
    }

    // Show professional overview if it has a value
    if (personalInfo.professionalOverview) {
      setShowProfessionalOverview(true);
    }
  }, [personalInfo]);

  const handleChange = (field: string, value: string) => {
    // Update local state immediately for responsive UI
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update Redux state
    dispatch({
      type: 'UPDATE_PERSONAL_INFO',
      payload: { [field]: value },
    });
  };

  const generateProfessionalOverview = async () => {
    if (!state.profile.experience.length) {
      alert('Please add some work experience first to generate a professional overview');
      return;
    }

    if (!authState.token) {
      alert('Please log in to use AI optimization');
      return;
    }

    setIsGeneratingOverview(true);
    try {
      const response = await fetch('/api/generate-professional-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify({
          profile: state.profile
        })
      });

      if (response.ok) {
        const data = await response.json();
        const overview = data.overview;
        handleChange('professionalOverview', overview);
        setShowProfessionalOverview(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate professional overview');
        if (response.status === 403) {
          alert(errorData.error || 'AI optimization limit reached. Please upgrade your plan for more optimizations.');
        } else {
          alert('Failed to generate overview. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error generating overview:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsGeneratingOverview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              style={{ color: '#1f2937' }}
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              style={{ color: '#1f2937' }}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              style={{ color: '#1f2937' }}
              placeholder="your.email@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              style={{ color: '#1f2937' }}
              placeholder="+44 123 456 7890"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            style={{ color: '#1f2937' }}
            placeholder="City, Country"
          />
        </div>

        {/* Social Links Section */}
        {!showSocialLinks && (
          <div className="mt-6">
            <button
              onClick={() => setShowSocialLinks(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 border border-teal-200 hover:border-teal-300 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Social Links</span>
            </button>
            <p className="text-xs text-gray-500 mt-1">Add website, LinkedIn, or GitHub links (optional)</p>
          </div>
        )}

        {showSocialLinks && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Social Links & Portfolio</h3>
              <button
                onClick={() => setShowSocialLinks(false)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hide section
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center space-x-1">
                    <span>🌐</span>
                    <span>Website</span>
                  </span>
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  style={{ color: '#1f2937' }}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center space-x-1">
                    <span>💼</span>
                    <span>LinkedIn</span>
                  </span>
                </label>
                <input
                  type="url"
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  style={{ color: '#1f2937' }}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div>
                <label htmlFor="github" className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center space-x-1">
                    <span>💻</span>
                    <span>GitHub</span>
                  </span>
                </label>
                <input
                  type="url"
                  id="github"
                  value={formData.github}
                  onChange={(e) => handleChange('github', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  style={{ color: '#1f2937' }}
                  placeholder="https://github.com/username"
                />
              </div>
            </div>
          </div>
        )}

        {/* Professional Overview Section */}
        {!showProfessionalOverview && (
          <div className="mt-6">
            <button
              onClick={() => setShowProfessionalOverview(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 border border-teal-200 hover:border-teal-300 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Professional Overview</span>
            </button>
            <p className="text-xs text-gray-500 mt-1">Write or AI-generate a professional summary (optional)</p>
          </div>
        )}

        {showProfessionalOverview && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Professional Overview</h3>
                <p className="text-xs text-gray-500">A brief summary of your professional experience and expertise</p>
              </div>
              <div className="flex items-center space-x-2">
                {!formData.professionalOverview.trim() && (
                  <button
                    onClick={generateProfessionalOverview}
                    disabled={isGeneratingOverview || !state.profile.experience.length}
                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGeneratingOverview ? (
                      <>
                        <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>AI Generate</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowProfessionalOverview(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Hide section
                </button>
              </div>
            </div>

            <div>
              <textarea
                id="professionalOverview"
                value={formData.professionalOverview}
                onChange={(e) => handleChange('professionalOverview', e.target.value)}
                rows={4}
                placeholder="Write a brief summary of your professional background, key skills, and career objectives. You can also use AI generation to create one automatically based on your work experience."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {formData.professionalOverview.length}/500 characters
                </p>
                {formData.professionalOverview.length > 500 && (
                  <p className="text-xs text-red-500">
                    Consider keeping it under 500 characters for optimal readability
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}