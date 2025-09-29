'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Experience } from '@/types/profile';

export default function ExperienceForm() {
  const { state, dispatch } = useProfile();
  const { experience } = state.profile;
  const [editingId, setEditingId] = useState<string | null>(null);

  // Debug logging to see what experience data we have
  console.log('🎭 ExperienceForm render - experience count:', experience.length);
  console.log('🎭 ExperienceForm experience data:', experience);

  const createNewExperience = (): Experience => ({
    id: Date.now().toString(),
    company: '',
    jobTitle: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [''],
  });

  const handleAdd = () => {
    const newExperience = createNewExperience();
    dispatch({ type: 'ADD_EXPERIENCE', payload: newExperience });
    setEditingId(newExperience.id);
  };

  const handleUpdate = (id: string, field: keyof Experience, value: any) => {
    dispatch({
      type: 'UPDATE_EXPERIENCE',
      payload: { id, data: { [field]: value } },
    });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_EXPERIENCE', payload: id });
    if (editingId === id) setEditingId(null);
  };

  const handleAchievementChange = (expId: string, achievementIndex: number, value: string) => {
    const exp = experience.find(e => e.id === expId);
    if (exp) {
      const newAchievements = [...exp.achievements];
      newAchievements[achievementIndex] = value;
      handleUpdate(expId, 'achievements', newAchievements);
    }
  };

  const addAchievement = (expId: string) => {
    const exp = experience.find(e => e.id === expId);
    if (exp) {
      const currentAchievements = exp.achievements || [];
      handleUpdate(expId, 'achievements', [...currentAchievements, '']);
    }
  };

  const removeAchievement = (expId: string, achievementIndex: number) => {
    const exp = experience.find(e => e.id === expId);
    if (exp && exp.achievements && exp.achievements.length > 1) {
      const newAchievements = exp.achievements.filter((_, i) => i !== achievementIndex);
      handleUpdate(expId, 'achievements', newAchievements);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Add Experience
        </button>
      </div>

      {experience.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No work experience added yet. Click "Add Experience" to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {experience
            .slice()
            .sort((a, b) => {
              // Sort by most recent first (current roles first, then by start date)
              // Current roles first
              if (a.current && !b.current) return -1;
              if (!a.current && b.current) return 1;

              // Then sort by start date (most recent first)
              const dateA = new Date(a.startDate || '1900-01-01');
              const dateB = new Date(b.startDate || '1900-01-01');
              return dateB.getTime() - dateA.getTime();
            })
            .map((exp) => (
            <div key={exp.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
              {editingId === exp.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company *
                      </label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => handleUpdate(exp.id, 'company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: '#1f2937' }}
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position *
                      </label>
                      <input
                        type="text"
                        value={exp.jobTitle}
                        onChange={(e) => handleUpdate(exp.id, 'jobTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: '#1f2937' }}
                        placeholder="Job title"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => handleUpdate(exp.id, 'location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => handleUpdate(exp.id, 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: '#1f2937' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="month"
                        value={exp.endDate}
                        onChange={(e) => handleUpdate(exp.id, 'endDate', e.target.value)}
                        disabled={exp.current}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                      <div className="mt-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => handleUpdate(exp.id, 'current', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">I currently work here</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Description
                    </label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => handleUpdate(exp.id, 'description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#1f2937' }}
                      placeholder="Describe your role and responsibilities..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Achievements
                    </label>
                    {exp.achievements.map((achievement, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => handleAchievementChange(exp.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Describe a key achievement..."
                        />
                        {exp.achievements.length > 1 && (
                          <button
                            onClick={() => removeAchievement(exp.id, index)}
                            className="px-2 py-2 text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addAchievement(exp.id)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add another achievement
                    </button>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex flex-col space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exp.jobTitle || 'Position not specified'}
                        </h3>
                        {exp.company && (
                          <p className="text-base font-medium text-gray-700">
                            {exp.company}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {exp.location && (
                            <span className="flex items-center">
                              📍 {exp.location}
                            </span>
                          )}
                          <span className="flex items-center">
                            📅 {exp.startDate || 'Start date not specified'} - {exp.current ? 'Present' : exp.endDate || 'End date not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingId(exp.id)}
                      className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  {exp.description && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{exp.description}</p>
                    </div>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && exp.achievements.some(a => a.trim()) && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Achievements</h4>
                      <ul className="space-y-1">
                        {exp.achievements.filter(a => a.trim()).map((achievement, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-700">
                            <span className="text-green-500 mr-2">•</span>
                            <span className="flex-1">{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!exp.jobTitle && !exp.company && !exp.description && (!exp.achievements || exp.achievements.filter(a => a.trim()).length === 0) && (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                      <p className="text-sm">No detailed information available for this experience.</p>
                      <p className="text-xs mt-1">Click "Edit" to add job details.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}