'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';

interface QuickActionModalsProps {
  activeAction: string | null;
  onClose: () => void;
}

export default function QuickActionModals({ activeAction, onClose }: QuickActionModalsProps) {
  const { state, dispatch } = useProfile();
  const [formData, setFormData] = useState({
    phone: '',
    company: '',
    jobTitle: '',
    skills: '',
    institution: '',
    degree: ''
  });

  const handlePhoneSubmit = () => {
    if (formData.phone.trim()) {
      dispatch({
        type: 'UPDATE_PERSONAL_INFO',
        payload: { phone: formData.phone.trim() }
      });
      onClose();
    }
  };

  const handleJobSubmit = () => {
    if (formData.company.trim() && formData.jobTitle.trim()) {
      const newExperience = {
        id: `exp-${Date.now()}`,
        company: formData.company.trim(),
        jobTitle: formData.jobTitle.trim(),
        location: '',
        startDate: '',
        endDate: '',
        current: true,
        description: '',
        achievements: []
      };
      dispatch({ type: 'ADD_EXPERIENCE', payload: newExperience });
      onClose();
    }
  };

  const handleSkillsSubmit = () => {
    if (formData.skills.trim()) {
      const skillsList = formData.skills.split(',').map(skill => skill.trim()).filter(Boolean);
      skillsList.forEach((skillName, index) => {
        const newSkill = {
          id: `skill-${Date.now()}-${index}`,
          name: skillName,
          level: 'intermediate',
          category: 'technical'
        };
        dispatch({ type: 'ADD_SKILL', payload: newSkill });
      });
      onClose();
    }
  };

  const handleEducationSubmit = () => {
    if (formData.institution.trim() && formData.degree.trim()) {
      const newEducation = {
        id: `edu-${Date.now()}`,
        institution: formData.institution.trim(),
        degree: formData.degree.trim(),
        field: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        gpa: '',
        achievements: []
      };
      dispatch({ type: 'ADD_EDUCATION', payload: newEducation });
      onClose();
    }
  };

  const renderModal = () => {
    switch (activeAction) {
      case 'quick-phone':
        return (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">📞</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Phone Number</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Adding your phone number will unlock job search features and allow recruiters to contact you directly.
            </p>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoFocus
            />
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handlePhoneSubmit}
                disabled={!formData.phone.trim()}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Phone Number
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'quick-job':
        return (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">💼</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Work Experience</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Quickly add your current or most recent job to strengthen your profile.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Job Title (e.g., Software Engineer)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoFocus
              />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleJobSubmit}
                disabled={!formData.company.trim() || !formData.jobTitle.trim()}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Experience
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'quick-skills':
        return (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">⚡</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Skills</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              List your key skills separated by commas. This helps with job matching and ATS optimization.
            </p>
            <textarea
              value={formData.skills}
              onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
              placeholder="JavaScript, React, Node.js, Python, Data Analysis..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoFocus
            />
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleSkillsSubmit}
                disabled={!formData.skills.trim()}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Skills
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'quick-education':
        return (
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🎓</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Education</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add your highest degree or most relevant educational background.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
                placeholder="Degree (e.g., Bachelor of Science)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoFocus
              />
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                placeholder="Institution Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleEducationSubmit}
                disabled={!formData.institution.trim() || !formData.degree.trim()}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Education
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!activeAction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {renderModal()}
      </div>
    </div>
  );
}