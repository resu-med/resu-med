'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { UserProfile } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileState {
  profile: UserProfile;
  loading: boolean;
  error: string | null;
  syncing: boolean;
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
  | { type: 'SET_SYNCING'; payload: boolean }
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
  syncing: false,
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
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const ProfileContext = createContext<{
  state: ProfileState;
  dispatch: React.Dispatch<ProfileAction>;
  saveProfile: () => Promise<void>;
  loadProfile: () => Promise<void>;
} | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const { state: authState } = useAuth();

  // Load profile from database when user logs in
  const loadProfile = useCallback(async () => {
    if (!authState.user?.email) {
      console.log('No user email available, skipping profile load');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('🔄 Loading profile from database for:', authState.user.email);
      const response = await fetch(`/api/profile?email=${encodeURIComponent(authState.user.email)}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Profile loaded from database:', data.profile);
        dispatch({ type: 'SET_PROFILE', payload: data.profile });
      } else {
        console.log('ℹ️ No existing profile found, using default');
        // Use default profile with user's email
        const defaultProfile = {
          ...initialProfile,
          personalInfo: {
            ...initialProfile.personalInfo,
            email: authState.user.email,
            firstName: authState.user.name?.split(' ')[0] || '',
            lastName: authState.user.name?.split(' ').slice(1).join(' ') || ''
          }
        };
        dispatch({ type: 'SET_PROFILE', payload: defaultProfile });
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load profile from database' });

      // Fallback to localStorage
      console.log('🔄 Falling back to localStorage');
      const savedProfile = localStorage.getItem('resumed-profile');
      if (savedProfile && savedProfile !== 'undefined' && savedProfile !== 'null') {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed && (parsed.personalInfo?.firstName || parsed.experience?.length || parsed.education?.length)) {
            console.log('✅ Loaded profile from localStorage fallback');
            dispatch({ type: 'SET_PROFILE', payload: parsed });
          }
        } catch (error) {
          console.error('❌ Error loading localStorage fallback:', error);
        }
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [authState.user?.email, authState.user?.name]);

  // Save profile to database
  const saveProfile = useCallback(async () => {
    if (!authState.user?.email) {
      console.log('No user email available, skipping profile save');
      return;
    }

    dispatch({ type: 'SET_SYNCING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log('💾 Saving profile to database for:', authState.user.email);
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: authState.user.email,
          profile: state.profile
        })
      });

      if (response.ok) {
        console.log('✅ Profile saved to database successfully');
        // Also save to localStorage as backup
        localStorage.setItem('resumed-profile', JSON.stringify(state.profile));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save profile to database' });

      // Fallback to localStorage only
      console.log('💾 Falling back to localStorage save');
      localStorage.setItem('resumed-profile', JSON.stringify(state.profile));
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [authState.user?.email, state.profile]);

  // Load profile when user changes or component mounts
  useEffect(() => {
    if (authState.user?.email) {
      loadProfile();
    } else {
      // User logged out, reset to default profile
      dispatch({ type: 'SET_PROFILE', payload: initialProfile });
    }
  }, [authState.user?.email, loadProfile]);

  // Auto-save profile changes (debounced)
  useEffect(() => {
    if (!authState.user?.email) return;

    // Skip auto-save for initial/empty profiles
    if (!state.profile.personalInfo.firstName &&
        state.profile.experience.length === 0 &&
        state.profile.education.length === 0 &&
        state.profile.skills.length === 0) {
      return;
    }

    // Debounce auto-save
    const timeoutId = setTimeout(() => {
      saveProfile();
    }, 2000); // Auto-save 2 seconds after changes

    return () => clearTimeout(timeoutId);
  }, [state.profile, authState.user?.email, saveProfile]);

  return (
    <ProfileContext.Provider value={{ state, dispatch, saveProfile, loadProfile }}>
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