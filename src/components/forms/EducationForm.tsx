'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Education } from '@/types/profile';

export default function EducationForm() {
  const { state, dispatch } = useProfile();
  const { education } = state.profile;
  const [editingId, setEditingId] = useState<string | null>(null);

  const createNewEducation = (): Education => ({
    id: Date.now().toString(),
    institution: '',
    degree: '',
    field: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    gpa: '',
    achievements: [''],
  });

  const handleAdd = () => {
    const newEducation = createNewEducation();
    dispatch({ type: 'ADD_EDUCATION', payload: newEducation });
    setEditingId(newEducation.id);
  };

  const handleUpdate = (id: string, field: keyof Education, value: any) => {
    dispatch({
      type: 'UPDATE_EDUCATION',
      payload: { id, data: { [field]: value } },
    });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_EDUCATION', payload: id });
    if (editingId === id) setEditingId(null);
  };

  const handleAchievementChange = (eduId: string, achievementIndex: number, value: string) => {
    const edu = education.find(e => e.id === eduId);
    if (edu) {
      const newAchievements = [...edu.achievements];
      newAchievements[achievementIndex] = value;
      handleUpdate(eduId, 'achievements', newAchievements);
    }
  };

  const addAchievement = (eduId: string) => {
    const edu = education.find(e => e.id === eduId);
    if (edu) {
      handleUpdate(eduId, 'achievements', [...edu.achievements, '']);
    }
  };

  const removeAchievement = (eduId: string, achievementIndex: number) => {
    const edu = education.find(e => e.id === eduId);
    if (edu && edu.achievements.length > 1) {
      const newAchievements = edu.achievements.filter((_, i) => i !== achievementIndex);
      handleUpdate(eduId, 'achievements', newAchievements);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Education</h2>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Add Education
        </button>
      </div>

      {education.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No education added yet. Click "Add Education" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map((edu) => (
            <div key={edu.id} className="border border-gray-200 rounded-lg p-6">
              {editingId === edu.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution *
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => handleUpdate(edu.id, 'institution', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="University or school name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Degree *
                      </label>
                      <select
                        value={edu.degree}
                        onChange={(e) => handleUpdate(edu.id, 'degree', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select degree</option>
                        <option value="High School Diploma">High School Diploma</option>
                        <option value="Associate's Degree">Associate's Degree</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                        <option value="Doctorate">Doctorate</option>
                        <option value="Professional Degree">Professional Degree</option>
                        <option value="Certificate">Certificate</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field of Study
                      </label>
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => handleUpdate(edu.id, 'field', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Computer Science, Business Administration"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={edu.location}
                        onChange={(e) => handleUpdate(edu.id, 'location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="month"
                        value={edu.startDate}
                        onChange={(e) => handleUpdate(edu.id, 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="month"
                        value={edu.endDate}
                        onChange={(e) => handleUpdate(edu.id, 'endDate', e.target.value)}
                        disabled={edu.current}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                      <div className="mt-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={edu.current}
                            onChange={(e) => handleUpdate(edu.id, 'current', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Currently studying</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GPA (Optional)
                      </label>
                      <input
                        type="text"
                        value={edu.gpa}
                        onChange={(e) => handleUpdate(edu.id, 'gpa', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="3.8/4.0 or 2:1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Achievements & Activities
                    </label>
                    {edu.achievements.map((achievement, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => handleAchievementChange(edu.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Dean's List, Student Council President, Research Assistant..."
                        />
                        {edu.achievements.length > 1 && (
                          <button
                            onClick={() => removeAchievement(edu.id, index)}
                            className="px-2 py-2 text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addAchievement(edu.id)}
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
                      onClick={() => handleDelete(edu.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {edu.degree} {edu.field && `in ${edu.field}`}
                      </h3>
                      <p className="text-sm text-gray-600">{edu.institution}</p>
                      {edu.location && (
                        <p className="text-sm text-gray-600">{edu.location}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {edu.startDate} - {edu.current ? 'Present' : edu.endDate || 'Present'}
                      </p>
                      {edu.gpa && (
                        <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingId(edu.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                  {edu.achievements.some(a => a.trim()) && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-700">Achievements & Activities:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        {edu.achievements.filter(a => a.trim()).map((achievement, index) => (
                          <li key={index}>{achievement}</li>
                        ))}
                      </ul>
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