// Profile completeness calculation and suggestions logic

export interface CompletenessSection {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'missing';
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  impact: string;
}

export interface ProfileCompleteness {
  overall: {
    percentage: number;
    score: number;
    maxScore: number;
    status: 'excellent' | 'good' | 'needs-work' | 'incomplete';
  };
  sections: CompletenessSection[];
  nextSteps: string[];
  readyForJobs: boolean;
  readyForTemplates: boolean;
}

export function calculateProfileCompleteness(profile: any): ProfileCompleteness {
  const sections: CompletenessSection[] = [];

  // Personal Info Section
  const personalInfo = analyzePersonalInfo(profile.personalInfo || {});
  sections.push(personalInfo);

  // Experience Section
  const experience = analyzeExperience(profile.experience || []);
  sections.push(experience);

  // Education Section
  const education = analyzeEducation(profile.education || []);
  sections.push(education);

  // Skills Section
  const skills = analyzeSkills(profile.skills || []);
  sections.push(skills);

  // Interests Section (optional but valuable)
  const interests = analyzeInterests(profile.interests || []);
  sections.push(interests);

  // Calculate overall score
  const totalScore = sections.reduce((sum, section) => sum + section.score, 0);
  const maxTotalScore = sections.reduce((sum, section) => sum + section.maxScore, 0);
  const percentage = Math.round((totalScore / maxTotalScore) * 100);

  let status: 'excellent' | 'good' | 'needs-work' | 'incomplete';
  if (percentage >= 90) status = 'excellent';
  else if (percentage >= 75) status = 'good';
  else if (percentage >= 50) status = 'needs-work';
  else status = 'incomplete';

  // Determine readiness for next steps
  const readyForJobs = percentage >= 75;
  const readyForTemplates = percentage >= 85;

  // Generate next steps
  const nextSteps = generateNextSteps(sections, percentage);

  return {
    overall: {
      percentage,
      score: totalScore,
      maxScore: maxTotalScore,
      status
    },
    sections,
    nextSteps,
    readyForJobs,
    readyForTemplates
  };
}

function analyzePersonalInfo(personalInfo: any): CompletenessSection {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 100;

  // Required fields
  const requiredFields = [
    { key: 'firstName', name: 'First name', points: 15 },
    { key: 'lastName', name: 'Last name', points: 15 },
    { key: 'email', name: 'Email address', points: 20 },
    { key: 'phone', name: 'Phone number', points: 20 }
  ];

  requiredFields.forEach(field => {
    if (personalInfo[field.key]?.trim()) {
      score += field.points;
    } else {
      issues.push(`Missing ${field.name}`);
      suggestions.push(`Add your ${field.name}`);
    }
  });

  // Optional but valuable fields
  const optionalFields = [
    { key: 'location', name: 'Location', points: 10 },
    { key: 'linkedin', name: 'LinkedIn profile', points: 10 },
    { key: 'website', name: 'Portfolio/website', points: 10 }
  ];

  optionalFields.forEach(field => {
    if (personalInfo[field.key]?.trim()) {
      score += field.points;
    } else {
      suggestions.push(`Consider adding your ${field.name}`);
    }
  });

  let status: 'complete' | 'partial' | 'missing';
  if (score >= 70) status = 'complete';
  else if (score >= 35) status = 'partial';
  else status = 'missing';

  return {
    id: 'personal',
    name: 'Personal Information',
    status,
    score,
    maxScore,
    issues,
    suggestions,
    priority: issues.length > 0 ? 'high' : 'medium',
    estimatedTime: issues.length > 2 ? '3 minutes' : '1 minute',
    impact: 'Required for job applications and recruiter contact'
  };
}

function analyzeExperience(experience: any[]): CompletenessSection {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 100;

  if (experience.length === 0) {
    issues.push('No work experience added');
    suggestions.push('Add at least one work experience');
    return {
      id: 'experience',
      name: 'Work Experience',
      status: 'missing',
      score: 0,
      maxScore,
      issues,
      suggestions,
      priority: 'high',
      estimatedTime: '5 minutes',
      impact: 'Critical for job matching and recruiter interest'
    };
  }

  // Base points for having experience
  score += 30;

  // Check experience quality
  const recentExperience = experience.filter(exp => {
    if (!exp.endDate && exp.current) return true;
    const endYear = parseInt(exp.endDate?.split('-')[0] || '0');
    return endYear >= new Date().getFullYear() - 5;
  });

  if (recentExperience.length === 0) {
    issues.push('No recent work experience (last 5 years)');
    suggestions.push('Add more recent work experience');
  } else {
    score += 20;
  }

  // Check for detailed descriptions
  const wellDescribed = experience.filter(exp =>
    exp.description?.length > 50 || exp.achievements?.length > 0
  );

  if (wellDescribed.length < experience.length / 2) {
    issues.push('Work experience needs more detail');
    suggestions.push('Add detailed descriptions and achievements to your roles');
  } else {
    score += 30;
  }

  // Check for job titles and companies
  const complete = experience.filter(exp =>
    exp.jobTitle?.trim() && exp.company?.trim()
  );

  if (complete.length === experience.length) {
    score += 20;
  } else {
    issues.push('Some experience entries are missing job titles or companies');
    suggestions.push('Complete all job titles and company names');
  }

  let status: 'complete' | 'partial' | 'missing';
  if (score >= 80) status = 'complete';
  else if (score >= 30) status = 'partial';
  else status = 'missing';

  return {
    id: 'experience',
    name: 'Work Experience',
    status,
    score,
    maxScore,
    issues,
    suggestions,
    priority: 'high',
    estimatedTime: issues.length > 1 ? '10 minutes' : '5 minutes',
    impact: 'Critical for job matching and recruiter interest'
  };
}

function analyzeEducation(education: any[]): CompletenessSection {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 100;

  if (education.length === 0) {
    issues.push('No education added');
    suggestions.push('Add at least your highest degree or certification');
    return {
      id: 'education',
      name: 'Education',
      status: 'missing',
      score: 0,
      maxScore,
      issues,
      suggestions,
      priority: 'medium',
      estimatedTime: '3 minutes',
      impact: 'Important for positions requiring specific qualifications'
    };
  }

  // Base points for having education
  score += 40;

  // Check for complete entries
  const complete = education.filter(edu =>
    edu.institution?.trim() && edu.degree?.trim()
  );

  if (complete.length === education.length) {
    score += 40;
  } else {
    issues.push('Some education entries are incomplete');
    suggestions.push('Complete institution and degree information');
  }

  // Check for graduation dates
  const withDates = education.filter(edu => edu.endDate?.trim());
  if (withDates.length < education.length) {
    suggestions.push('Add graduation dates to education entries');
  } else {
    score += 20;
  }

  let status: 'complete' | 'partial' | 'missing';
  if (score >= 80) status = 'complete';
  else if (score >= 40) status = 'partial';
  else status = 'missing';

  return {
    id: 'education',
    name: 'Education',
    status,
    score,
    maxScore,
    issues,
    suggestions,
    priority: 'medium',
    estimatedTime: '3 minutes',
    impact: 'Important for positions requiring specific qualifications'
  };
}

function analyzeSkills(skills: any[]): CompletenessSection {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 100;

  if (skills.length === 0) {
    issues.push('No skills added');
    suggestions.push('Add at least 5-10 relevant skills');
    return {
      id: 'skills',
      name: 'Skills',
      status: 'missing',
      score: 0,
      maxScore,
      issues,
      suggestions,
      priority: 'high',
      estimatedTime: '5 minutes',
      impact: 'Essential for keyword matching and ATS optimization'
    };
  }

  // Base points based on quantity
  if (skills.length >= 10) score += 40;
  else if (skills.length >= 5) score += 25;
  else score += 10;

  if (skills.length < 5) {
    issues.push('Need more skills (minimum 5 recommended)');
    suggestions.push('Add more relevant technical and soft skills');
  }

  // Check for skill categories diversity
  const categories = [...new Set(skills.map(skill => skill.category))];
  if (categories.length >= 2) {
    score += 30;
  } else {
    suggestions.push('Add skills from different categories (technical, soft skills, etc.)');
  }

  // Check for skill levels
  const withLevels = skills.filter(skill => skill.level && skill.level !== '');
  if (withLevels.length === skills.length) {
    score += 30;
  } else {
    suggestions.push('Set proficiency levels for your skills');
  }

  let status: 'complete' | 'partial' | 'missing';
  if (score >= 80) status = 'complete';
  else if (score >= 25) status = 'partial';
  else status = 'missing';

  return {
    id: 'skills',
    name: 'Skills',
    status,
    score,
    maxScore,
    issues,
    suggestions,
    priority: 'high',
    estimatedTime: '5 minutes',
    impact: 'Essential for keyword matching and ATS optimization'
  };
}

function analyzeInterests(interests: any[]): CompletenessSection {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  const maxScore = 100;

  if (interests.length === 0) {
    suggestions.push('Add 3-5 professional interests or hobbies');
    return {
      id: 'interests',
      name: 'Interests',
      status: 'missing',
      score: 0,
      maxScore,
      issues,
      suggestions,
      priority: 'low',
      estimatedTime: '2 minutes',
      impact: 'Helps show personality and cultural fit'
    };
  }

  // Base points for having interests
  if (interests.length >= 3) score += 70;
  else score += 40;

  // Check for descriptions
  const withDescriptions = interests.filter(interest => interest.description?.trim());
  if (withDescriptions.length > 0) {
    score += 30;
  } else {
    suggestions.push('Add brief descriptions to your interests');
  }

  let status: 'complete' | 'partial' | 'missing';
  if (score >= 70) status = 'complete';
  else if (score >= 40) status = 'partial';
  else status = 'missing';

  return {
    id: 'interests',
    name: 'Interests',
    status,
    score,
    maxScore,
    issues,
    suggestions,
    priority: 'low',
    estimatedTime: '2 minutes',
    impact: 'Helps show personality and cultural fit'
  };
}

function generateNextSteps(sections: CompletenessSection[], overallPercentage: number): string[] {
  const nextSteps: string[] = [];

  // High priority issues first
  const highPriority = sections
    .filter(section => section.priority === 'high' && section.issues.length > 0)
    .sort((a, b) => a.score - b.score);

  highPriority.forEach(section => {
    nextSteps.push(`Fix ${section.name}: ${section.issues[0]}`);
  });

  // Add suggestions based on overall score
  if (overallPercentage < 50) {
    nextSteps.push('Focus on completing required sections first');
  } else if (overallPercentage < 75) {
    nextSteps.push('Add more detail to existing sections');
  } else if (overallPercentage < 90) {
    nextSteps.push('Polish your profile with remaining suggestions');
  }

  return nextSteps.slice(0, 3); // Limit to top 3 next steps
}

export function getProfileHealthStatus(percentage: number): {
  status: string;
  color: string;
  icon: string;
  message: string;
} {
  if (percentage >= 90) {
    return {
      status: 'Excellent',
      color: 'green',
      icon: '🏆',
      message: 'Your profile is outstanding! Ready for premium job matching.'
    };
  } else if (percentage >= 75) {
    return {
      status: 'Good',
      color: 'blue',
      icon: '✅',
      message: 'Great profile! Ready for job searching with strong match potential.'
    };
  } else if (percentage >= 50) {
    return {
      status: 'Needs Work',
      color: 'yellow',
      icon: '⚠️',
      message: 'Good start! Complete a few more sections to unlock job search.'
    };
  } else {
    return {
      status: 'Incomplete',
      color: 'red',
      icon: '❌',
      message: 'Profile needs attention. Complete key sections to get started.'
    };
  }
}