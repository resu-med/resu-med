'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Skill } from '@/types/profile';

export default function SkillsForm() {
  const { state, dispatch } = useProfile();
  const { skills } = state.profile;
  const [newSkill, setNewSkill] = useState<Omit<Skill, 'id'>>({
    name: '',
    category: 'technical',
    level: 'intermediate',
  });

  const handleAdd = () => {
    if (newSkill.name.trim()) {
      const skill: Skill = {
        ...newSkill,
        id: Date.now().toString(),
      };
      dispatch({ type: 'ADD_SKILL', payload: skill });
      setNewSkill({ name: '', category: 'technical', level: 'intermediate' });
    }
  };

  const handleUpdate = (id: string, field: keyof Skill, value: any) => {
    dispatch({
      type: 'UPDATE_SKILL',
      payload: { id, data: { [field]: value } },
    });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_SKILL', payload: id });
  };

  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const categoryLabels = {
    technical: 'Technical Skills',
    soft: 'Soft Skills',
    language: 'Languages',
    other: 'Other Skills',
  };

  const levelLabels = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };

  const getLevelColor = (level: Skill['level']) => {
    switch (level) {
      case 'beginner': return 'bg-red-100 text-red-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'expert': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Skill</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Skill name (e.g., JavaScript, Leadership, Spanish)"
              />
            </div>
            <div>
              <select
                value={newSkill.category}
                onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value as Skill['category'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="technical">Technical</option>
                <option value="soft">Soft Skills</option>
                <option value="language">Language</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={newSkill.level}
                onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as Skill['level'] })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={!newSkill.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No skills added yet. Add your first skill above to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categorySkills = skillsByCategory[category];
            if (!categorySkills || categorySkills.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">{label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categorySkills.map((skill) => (
                    <div key={skill.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) => handleUpdate(skill.id, 'name', e.target.value)}
                          className="font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 focus:outline-none flex-1"
                        />
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={skill.category}
                          onChange={(e) => handleUpdate(skill.id, 'category', e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="technical">Technical</option>
                          <option value="soft">Soft Skills</option>
                          <option value="language">Language</option>
                          <option value="other">Other</option>
                        </select>
                        <select
                          value={skill.level}
                          onChange={(e) => handleUpdate(skill.id, 'level', e.target.value)}
                          className={`text-xs px-2 py-1 rounded border-none ${getLevelColor(skill.level)}`}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {skills.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Skill Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific with technical skills (e.g., "React.js" instead of just "React")</li>
            <li>• Include certifications in your skill names when relevant</li>
            <li>• Use language skills to specify proficiency (e.g., "Spanish - Conversational")</li>
            <li>• Soft skills should be relevant to your target roles</li>
          </ul>
        </div>
      )}
    </div>
  );
}