'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { UserProfile } from '@/types/profile';

interface ProfileState {
  profile: UserProfile;
  loading: boolean;
  error: string | null;
}

type ProfileAction =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PERSONAL_INFO'; payload: Partial<UserProfile['personalInfo']> }
  | { type: 'ADD_EXPERIENCE'; payload: UserProfile['experience'][0] }
  | { type: 'UPDATE_EXPERIENCE'; payload: { id: string; data: Partial<UserProfile['experience'][0]> } }
  | { type: 'DELETE_EXPERIENCE'; payload: string }
  | { type: 'ADD_EDUCATION'; payload: UserProfile['education'][0] }
  | { type: 'UPDATE_EDUCATION'; payload: { id: string; data: Partial<UserProfile['education'][0]> } }
  | { type: 'DELETE_EDUCATION'; payload: string }
  | { type: 'ADD_SKILL'; payload: UserProfile['skills'][0] }
  | { type: 'UPDATE_SKILL'; payload: { id: string; data: Partial<UserProfile['skills'][0]> } }
  | { type: 'DELETE_SKILL'; payload: string }
  | { type: 'ADD_INTEREST'; payload: UserProfile['interests'][0] }
  | { type: 'UPDATE_INTEREST'; payload: { id: string; data: Partial<UserProfile['interests'][0]> } }
  | { type: 'DELETE_INTEREST'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialProfile: UserProfile = {
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
};

const initialState: ProfileState = {
  profile: initialProfile,
  loading: false,
  error: null,
};

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  console.log('ProfileReducer action:', action.type, action.payload); // Debug logging
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'UPDATE_PERSONAL_INFO':
      return {
        ...state,
        profile: {
          ...state.profile,
          personalInfo: { ...state.profile.personalInfo, ...action.payload },
        },
      };
    case 'ADD_EXPERIENCE':
      return {
        ...state,
        profile: {
          ...state.profile,
          experience: [...state.profile.experience, action.payload],
        },
      };
    case 'UPDATE_EXPERIENCE':
      return {
        ...state,
        profile: {
          ...state.profile,
          experience: state.profile.experience.map(exp =>
            exp.id === action.payload.id ? { ...exp, ...action.payload.data } : exp
          ),
        },
      };
    case 'DELETE_EXPERIENCE':
      return {
        ...state,
        profile: {
          ...state.profile,
          experience: state.profile.experience.filter(exp => exp.id !== action.payload),
        },
      };
    case 'ADD_EDUCATION':
      return {
        ...state,
        profile: {
          ...state.profile,
          education: [...state.profile.education, action.payload],
        },
      };
    case 'UPDATE_EDUCATION':
      return {
        ...state,
        profile: {
          ...state.profile,
          education: state.profile.education.map(edu =>
            edu.id === action.payload.id ? { ...edu, ...action.payload.data } : edu
          ),
        },
      };
    case 'DELETE_EDUCATION':
      return {
        ...state,
        profile: {
          ...state.profile,
          education: state.profile.education.filter(edu => edu.id !== action.payload),
        },
      };
    case 'ADD_SKILL':
      return {
        ...state,
        profile: {
          ...state.profile,
          skills: [...state.profile.skills, action.payload],
        },
      };
    case 'UPDATE_SKILL':
      return {
        ...state,
        profile: {
          ...state.profile,
          skills: state.profile.skills.map(skill =>
            skill.id === action.payload.id ? { ...skill, ...action.payload.data } : skill
          ),
        },
      };
    case 'DELETE_SKILL':
      return {
        ...state,
        profile: {
          ...state.profile,
          skills: state.profile.skills.filter(skill => skill.id !== action.payload),
        },
      };
    case 'ADD_INTEREST':
      return {
        ...state,
        profile: {
          ...state.profile,
          interests: [...state.profile.interests, action.payload],
        },
      };
    case 'UPDATE_INTEREST':
      return {
        ...state,
        profile: {
          ...state.profile,
          interests: state.profile.interests.map(interest =>
            interest.id === action.payload.id ? { ...interest, ...action.payload.data } : interest
          ),
        },
      };
    case 'DELETE_INTEREST':
      return {
        ...state,
        profile: {
          ...state.profile,
          interests: state.profile.interests.filter(interest => interest.id !== action.payload),
        },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const ProfileContext = createContext<{
  state: ProfileState;
  dispatch: React.Dispatch<ProfileAction>;
} | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  useEffect(() => {
    const savedProfile = localStorage.getItem('resumed-profile');
    console.log('Loading saved profile from localStorage:', savedProfile); // Debug
    if (savedProfile && savedProfile !== 'undefined' && savedProfile !== 'null') {
      try {
        const parsed = JSON.parse(savedProfile);
        // Only load if it's not the initial empty state
        if (parsed && (parsed.personalInfo?.firstName || parsed.experience?.length || parsed.education?.length)) {
          console.log('Parsed saved profile:', parsed); // Debug
          dispatch({ type: 'SET_PROFILE', payload: parsed });
        }
      } catch (error) {
        console.error('Error loading saved profile:', error);
      }
    }
  }, []);

  useEffect(() => {
    console.log('Saving profile to localStorage:', state.profile); // Debug
    localStorage.setItem('resumed-profile', JSON.stringify(state.profile));
  }, [state.profile]);

  return (
    <ProfileContext.Provider value={{ state, dispatch }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}