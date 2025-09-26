export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
  professionalOverview?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: string;
  achievements: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Interest {
  id: string;
  name: string;
  category: 'hobby' | 'volunteer' | 'interest' | 'other';
  description?: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  datePosted: string;
  url: string;
  source: string;
  skills: string[];
  saved: boolean;
  applied: boolean;
}

export interface JobSearchFilters {
  keywords: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  remote: boolean;
  selectedProviders?: string[];
}

export interface SavedJob {
  job: JobListing;
  savedDate: string;
  notes?: string;
}

export interface UserProfile {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  interests: Interest[];
  savedJobs?: SavedJob[];
}