'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Interest } from '@/types/profile';

export default function InterestsForm() {
  const { state, dispatch } = useProfile();
  const { interests } = state.profile;
  const [newInterest, setNewInterest] = useState<Omit<Interest, 'id'>>({
    name: '',
    category: 'hobby',
    description: '',
  });

  const handleAdd = () => {
    if (newInterest.name.trim()) {
      const interest: Interest = {
        ...newInterest,
        id: Date.now().toString(),
      };
      dispatch({ type: 'ADD_INTEREST', payload: interest });
      setNewInterest({ name: '', category: 'hobby', description: '' });
    }
  };

  const handleUpdate = (id: string, field: keyof Interest, value: any) => {
    dispatch({
      type: 'UPDATE_INTEREST',
      payload: { id, data: { [field]: value } },
    });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_INTEREST', payload: id });
  };

  const interestsByCategory = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = [];
    }
    acc[interest.category].push(interest);
    return acc;
  }, {} as Record<string, Interest[]>);

  const categoryLabels = {
    hobby: 'Hobbies & Interests',
    volunteer: 'Volunteer Work',
    interest: 'Professional Interests',
    other: 'Other Activities',
  };

  const getCategoryColor = (category: Interest['category']) => {
    switch (category) {
      case 'hobby': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200';
      case 'interest': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Interests & Volunteer Work</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add your hobbies, interests, volunteer work, and other activities that showcase your personality and values.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Interest/Activity</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={newInterest.name}
                  onChange={(e) => setNewInterest({ ...newInterest, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Interest/Activity name (e.g., Photography, Local Food Bank, Rock Climbing)"
                />
              </div>
              <div>
                <select
                  value={newInterest.category}
                  onChange={(e) => setNewInterest({ ...newInterest, category: e.target.value as Interest['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="hobby">Hobby/Interest</option>
                  <option value="volunteer">Volunteer Work</option>
                  <option value="interest">Professional Interest</option>
                  <option value="other">Other Activity</option>
                </select>
              </div>
            </div>
            <div>
              <textarea
                value={newInterest.description}
                onChange={(e) => setNewInterest({ ...newInterest, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description (optional) - e.g., 'Volunteer photographer for local animal shelter' or 'Competitive rock climber with 5 years experience'"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={!newInterest.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Interest
              </button>
            </div>
          </div>
        </div>
      </div>

      {interests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No interests or activities added yet. Add your first one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categoryInterests = interestsByCategory[category];
            if (!categoryInterests || categoryInterests.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">{label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryInterests.map((interest) => (
                    <div
                      key={interest.id}
                      className={`border rounded-lg p-4 ${getCategoryColor(interest.category)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <input
                          type="text"
                          value={interest.name}
                          onChange={(e) => handleUpdate(interest.id, 'name', e.target.value)}
                          className="font-medium bg-transparent border-none p-0 focus:ring-0 focus:outline-none flex-1 text-inherit"
                        />
                        <button
                          onClick={() => handleDelete(interest.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mb-3">
                        <select
                          value={interest.category}
                          onChange={(e) => handleUpdate(interest.id, 'category', e.target.value)}
                          className="text-xs px-2 py-1 rounded bg-white border border-gray-300"
                        >
                          <option value="hobby">Hobby/Interest</option>
                          <option value="volunteer">Volunteer Work</option>
                          <option value="interest">Professional Interest</option>
                          <option value="other">Other Activity</option>
                        </select>
                      </div>

                      <textarea
                        value={interest.description || ''}
                        onChange={(e) => handleUpdate(interest.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add a brief description..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {interests.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 Tips for Interests & Activities</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• <strong>Volunteer Work:</strong> Include organizations, roles, and impact you've made</li>
            <li>• <strong>Hobbies:</strong> Choose ones that show desirable traits (teamwork, creativity, dedication)</li>
            <li>• <strong>Professional Interests:</strong> Include industry trends, technologies, or causes you follow</li>
            <li>• <strong>Keep it relevant:</strong> Consider how each interest might relate to your career goals</li>
            <li>• <strong>Be authentic:</strong> Only include genuine interests you can discuss in interviews</li>
          </ul>
        </div>
      )}

      {/* Clear All Profile Data Button */}
      <div className="border-t pt-6 mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Reset Profile</h4>
          <p className="text-sm text-red-700 mb-3">
            This will permanently delete all your profile information including personal details, experience, education, skills, and interests.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all profile data? This action cannot be undone.')) {
                // Clear localStorage
                localStorage.removeItem('resumed-profile');

                // Reset all profile data to initial empty state
                dispatch({ type: 'SET_PROFILE', payload: {
                  personalInfo: {
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    location: '',
                    website: '',
                    linkedin: '',
                    github: '',
                  },
                  experience: [],
                  education: [],
                  skills: [],
                  interests: [],
                }});
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear All Profile Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}