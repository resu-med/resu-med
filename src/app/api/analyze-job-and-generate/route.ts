import { NextRequest, NextResponse } from 'next/server';
import { UserProfile } from '@/types/profile';

interface JobAnalysisRequest {
  jobDescription: string;
  jobTitle: string;
  companyName: string;
  profile: UserProfile;
}

interface JobAnalysis {
  keyRequirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  softSkills?: string[];
  experienceYears?: string;
  educationRequirements?: string[];
  responsibilities?: string[];
  keywords?: string[];
  companyInfo: string;
  roleLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industryType: string;
  matchingScore: number;
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, jobTitle, companyName, profile }: JobAnalysisRequest = await request.json();

    if (!jobDescription || !jobTitle || !profile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`🎯 Analyzing job: ${jobTitle} at ${companyName}`);

    // Use OpenAI if available, otherwise use intelligent fallback
    let analysis: JobAnalysis;
    let resume: string;
    let coverLetter: string;

    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      console.log('🤖 Using OpenAI for advanced analysis and generation');
      const result = await generateWithOpenAI(jobDescription, jobTitle, companyName, profile);
      analysis = result.analysis;
      resume = result.resume;
      coverLetter = result.coverLetter;
    } else {
      console.log('🧠 Using intelligent fallback analysis and generation');
      const result = await generateWithIntelligentFallback(jobDescription, jobTitle, companyName, profile);
      analysis = result.analysis;
      resume = result.resume;
      coverLetter = result.coverLetter;
    }

    return NextResponse.json({
      analysis,
      resume,
      coverLetter
    });

  } catch (error) {
    console.error('Job analysis and generation error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze job and generate content' },
      { status: 500 }
    );
  }
}

async function generateWithOpenAI(jobDescription: string, jobTitle: string, companyName: string, profile: UserProfile) {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  // Enhanced job description analysis
  const analysisPrompt = `
    As an expert career consultant and ATS specialist, perform a comprehensive analysis of this job description:

    Job Title: ${jobTitle}
    Company: ${companyName}
    Job Description: ${jobDescription}

    Extract and categorize ALL relevant information. Return a detailed JSON response:
    {
      "keyRequirements": ["8-10 specific, measurable requirements from the job posting"],
      "requiredSkills": ["comprehensive list of required technical skills, tools, technologies, and methodologies"],
      "preferredSkills": ["all nice-to-have skills, certifications, and bonus qualifications"],
      "softSkills": ["leadership, communication, teamwork, and other interpersonal skills mentioned"],
      "experienceYears": "X-Y years or specific experience requirements",
      "educationRequirements": ["degree requirements, certifications, or educational preferences"],
      "responsibilities": ["key day-to-day responsibilities and duties"],
      "companyInfo": "company culture, values, mission, or context mentioned",
      "roleLevel": "entry|mid|senior|executive",
      "industryType": "specific industry classification",
      "keywords": ["important ATS keywords and phrases to include in resume"],
      "matchingScore": 85,
      "recommendations": ["5-7 specific, actionable recommendations for tailoring application"]
    }

    Focus on extracting specific requirements, metrics, technologies, and qualifications. Identify ALL ATS keywords.
  `;

  const analysisResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert career consultant and resume specialist. Respond only with valid JSON.' },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  let analysis: JobAnalysis;
  try {
    analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');
  } catch {
    analysis = generateFallbackAnalysis(jobDescription, jobTitle);
  }

  // Generate highly tailored, detailed resume
  const resumePrompt = `
    You are an expert resume writer specializing in ATS optimization and job-specific tailoring. Create a comprehensive, professional resume that will get past ATS systems and impress hiring managers.

    TARGET POSITION:
    Job Title: ${jobTitle}
    Company: ${companyName}

    JOB REQUIREMENTS TO MATCH:
    Key Requirements: ${analysis.keyRequirements?.join(' • ') || 'Standard requirements'}
    Required Skills: ${analysis.requiredSkills?.join(', ') || 'General skills'}
    Preferred Skills: ${analysis.preferredSkills?.join(', ') || 'Additional skills'}
    Soft Skills: ${analysis.softSkills?.join(', ') || 'Communication, teamwork'}
    Experience Required: ${analysis.experienceYears || 'Relevant experience'}
    Key Responsibilities: ${analysis.responsibilities?.join(' • ') || 'Standard responsibilities'}
    ATS Keywords: ${analysis.keywords?.join(', ') || 'Industry keywords'}

    CANDIDATE PROFILE:
    Name: ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}
    Contact: ${profile.personalInfo.email} | ${profile.personalInfo.phone} | ${profile.personalInfo.location}
    LinkedIn: ${profile.personalInfo.linkedin || 'N/A'}
    Professional Overview: ${profile.personalInfo.professionalOverview || 'Professional with relevant experience'}

    DETAILED EXPERIENCE:
    ${profile.experience.map(exp => `
    Position: ${exp.position}
    Company: ${exp.company}
    Location: ${exp.location}
    Duration: ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'End Date'}
    Description: ${exp.description}
    Key Achievements: ${exp.achievements?.length > 0 ? exp.achievements.join(' • ') : 'Delivered results and exceeded expectations'}
    `).join('\n')}

    EDUCATION:
    ${profile.education.map(edu => `
    ${edu.degree} in ${edu.field}
    ${edu.institution}, ${edu.location}
    ${edu.startDate} - ${edu.current ? 'Present' : edu.endDate || 'Graduation'}
    ${edu.gpa ? `GPA: ${edu.gpa}` : ''}
    ${edu.achievements?.length > 0 ? `Achievements: ${edu.achievements.join(' • ')}` : ''}
    `).join('\n')}

    SKILLS INVENTORY:
    ${profile.skills.map(skill => `${skill.name} (${skill.level} - ${skill.category})`).join(' • ')}

    CREATION INSTRUCTIONS:
    1. **PROFESSIONAL SUMMARY**: Write a compelling 3-4 line summary that:
       - Incorporates the exact job title and key requirements
       - Uses specific keywords from the job description
       - Highlights most relevant experience and quantifiable achievements
       - Shows clear alignment with the role

    2. **CORE COMPETENCIES**: Create a skills section that:
       - Prioritizes skills that directly match job requirements
       - Uses exact terminology from the job posting
       - Includes both technical and soft skills
       - Groups related skills logically

    3. **PROFESSIONAL EXPERIENCE**: For each role:
       - Write compelling bullet points (4-6 per role for most recent)
       - Start each bullet with strong action verbs
       - Quantify achievements with specific metrics where possible
       - Highlight responsibilities that align with target role
       - Use keywords from job description naturally
       - Show progression and growth

    4. **EDUCATION & CERTIFICATIONS**:
       - Highlight education that matches requirements
       - Include relevant coursework if applicable
       - Add any certifications mentioned in job posting

    5. **ATS OPTIMIZATION**:
       - Use exact keywords from job description
       - Include synonyms and variations
       - Maintain natural language flow
       - Use standard section headings

    FORMAT REQUIREMENTS:
    - Clean, professional layout
    - Standard section headers (PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, EDUCATION)
    - Consistent formatting
    - ATS-friendly (no tables, graphics, or unusual formatting)
    - 1-2 pages length

    IMPORTANT: Return ONLY the complete resume content. No explanations or meta-commentary. The output must be ready to send directly to a recruiter.
  `;

  const resumeResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a professional resume writer specializing in ATS-friendly, job-specific resumes.' },
      { role: 'user', content: resumePrompt }
    ],
    temperature: 0.3,
    max_tokens: 3000
  });

  // Generate tailored cover letter
  const coverLetterPrompt = `
    Write a compelling, personalized cover letter for this job application:

    Job Title: ${jobTitle}
    Company: ${companyName}
    Applicant: ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}

    Key points to address:
    - Why they're interested in this specific role and company
    - How their experience aligns with the job requirements: ${analysis.keyRequirements.slice(0, 3).join(', ')}
    - Specific examples from their background: ${profile.experience.slice(0, 2).map(exp => `${exp.position} at ${exp.company}`).join(', ')}
    - What value they can bring to the role

    Make it:
    - Professional but personable
    - Specific to this job and company
    - Concise (3-4 paragraphs)
    - Compelling and action-oriented

    Format as a complete cover letter ready to send.

    IMPORTANT: Return ONLY the cover letter content. Do NOT include any explanatory text, meta-commentary, or descriptions about the cover letter. The output should be ready to send to a recruiter as-is.
  `;

  const coverLetterResponse = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a professional career coach specializing in compelling cover letters.' },
      { role: 'user', content: coverLetterPrompt }
    ],
    temperature: 0.5,
    max_tokens: 1500
  });

  return {
    analysis,
    resume: resumeResponse.choices[0].message.content || 'Resume generation failed',
    coverLetter: coverLetterResponse.choices[0].message.content || 'Cover letter generation failed'
  };
}

async function generateWithIntelligentFallback(jobDescription: string, jobTitle: string, companyName: string, profile: UserProfile) {
  console.log('🧠 Generating intelligent analysis and content without OpenAI');

  // Intelligent job analysis
  const analysis = generateFallbackAnalysis(jobDescription, jobTitle);

  // Calculate matching score based on profile
  const userSkills = profile.skills.map(s => s.name.toLowerCase());
  const jobSkills = analysis.requiredSkills.map(s => s.toLowerCase());
  const matchingSkills = userSkills.filter(skill =>
    jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
  );
  analysis.matchingScore = Math.min(95, Math.max(45, (matchingSkills.length / Math.max(jobSkills.length, 1)) * 100 + 20));

  // Generate tailored resume
  const resume = generateTailoredResume(profile, jobTitle, companyName, analysis);

  // Generate tailored cover letter
  const coverLetter = generateTailoredCoverLetter(profile, jobTitle, companyName, analysis);

  return { analysis, resume, coverLetter };
}

function generateFallbackAnalysis(jobDescription: string, jobTitle: string): JobAnalysis {
  const desc = jobDescription.toLowerCase();

  // Comprehensive skill and technology keywords
  const skillKeywords = [
    // Programming Languages
    'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',

    // Frontend Technologies
    'react', 'vue', 'angular', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'nextjs', 'nuxt',

    // Backend Technologies
    'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'fastapi',

    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite',

    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible',

    // Development Tools
    'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'figma', 'sketch',

    // Methodologies & Soft Skills
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd',
    'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical',
    'project management', 'stakeholder management', 'client relations',

    // Business & Industry Skills
    'marketing', 'sales', 'design', 'ux/ui', 'data analysis', 'machine learning',
    'artificial intelligence', 'blockchain', 'cybersecurity', 'compliance'
  ];

  const requiredSkills = skillKeywords.filter(skill =>
    desc.includes(skill) || desc.includes(skill.replace('.js', '')) || desc.includes(skill.replace('-', ' '))
  );

  const keyRequirements = [
    `Experience in ${jobTitle.toLowerCase()} or similar role`,
    'Strong technical and analytical skills',
    'Excellent communication and collaboration abilities',
    'Problem-solving and critical thinking skills',
    'Ability to work independently and in team environments'
  ];

  if (requiredSkills.length > 0) {
    keyRequirements.unshift(`Proficiency in ${requiredSkills.slice(0, 3).join(', ')}`);
  }

  // Determine role level
  let roleLevel: 'entry' | 'mid' | 'senior' | 'executive' = 'mid';
  if (desc.includes('senior') || desc.includes('lead') || desc.includes('principal')) {
    roleLevel = 'senior';
  } else if (desc.includes('junior') || desc.includes('entry') || desc.includes('graduate')) {
    roleLevel = 'entry';
  } else if (desc.includes('director') || desc.includes('vp') || desc.includes('executive')) {
    roleLevel = 'executive';
  }

  // Determine industry
  let industryType = 'Technology';
  if (desc.includes('healthcare') || desc.includes('medical')) industryType = 'Healthcare';
  else if (desc.includes('finance') || desc.includes('banking')) industryType = 'Finance';
  else if (desc.includes('education') || desc.includes('teaching')) industryType = 'Education';
  else if (desc.includes('marketing') || desc.includes('advertising')) industryType = 'Marketing';
  else if (desc.includes('retail') || desc.includes('sales')) industryType = 'Retail';

  // Extract soft skills mentioned in job description
  const softSkills = [
    'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical',
    'critical thinking', 'creativity', 'adaptability', 'time management', 'organization'
  ].filter(skill => desc.includes(skill));

  // Extract experience requirements
  const yearMatches = desc.match(/(\d+)\+?\s*years?/g);
  const experienceYears = yearMatches ? yearMatches[0] : 'Relevant experience required';

  // Extract common responsibilities keywords
  const responsibilityKeywords = [
    'develop', 'design', 'implement', 'maintain', 'collaborate', 'lead', 'manage',
    'analyze', 'optimize', 'troubleshoot', 'document', 'test', 'deploy'
  ];
  const responsibilities = responsibilityKeywords.filter(resp => desc.includes(resp))
    .map(resp => `${resp.charAt(0).toUpperCase() + resp.slice(1)} solutions and systems`);

  return {
    keyRequirements: keyRequirements.slice(0, 8),
    requiredSkills: requiredSkills.slice(0, 12),
    preferredSkills: requiredSkills.slice(12, 18),
    softSkills: softSkills.length > 0 ? softSkills : ['communication', 'teamwork', 'problem-solving'],
    experienceYears,
    educationRequirements: desc.includes('bachelor') || desc.includes('degree') ?
      ['Bachelor\'s degree or equivalent experience'] : ['Relevant education or experience'],
    responsibilities: responsibilities.length > 0 ? responsibilities.slice(0, 5) : [
      'Develop and maintain high-quality solutions',
      'Collaborate with cross-functional teams',
      'Analyze requirements and implement solutions'
    ],
    keywords: [...requiredSkills, ...softSkills, jobTitle.toLowerCase().split(' ')].slice(0, 20),
    companyInfo: 'Dynamic organization offering growth opportunities',
    roleLevel,
    industryType,
    matchingScore: 75,
    recommendations: [
      'Incorporate specific keywords from the job description throughout your resume',
      'Quantify your achievements with specific metrics and results where possible',
      'Highlight experience that directly relates to the key requirements listed',
      'Emphasize your proficiency in the required technical skills and tools',
      'Demonstrate your soft skills through concrete examples and achievements',
      'Research the company\'s values and culture to align your application',
      'Prepare specific examples that showcase your problem-solving abilities'
    ]
  };
}

function generateTailoredResume(profile: UserProfile, jobTitle: string, companyName: string, analysis: JobAnalysis): string {
  const { personalInfo, experience, education, skills } = profile;

  const relevantSkills = skills.filter(skill =>
    analysis.requiredSkills.some(req =>
      req.toLowerCase().includes(skill.name.toLowerCase()) ||
      skill.name.toLowerCase().includes(req.toLowerCase())
    )
  );

  // Enhanced professional summary using professional overview if available
  const professionalSummary = personalInfo.professionalOverview ||
    getRoleSummary(jobTitle, experience, analysis);

  // Categorize skills for better presentation
  const preferredSkills = skills.filter(skill =>
    analysis.preferredSkills?.some(pref =>
      pref.toLowerCase().includes(skill.name.toLowerCase()) ||
      skill.name.toLowerCase().includes(pref.toLowerCase())
    )
  );

  const otherSkills = skills.filter(skill =>
    !relevantSkills.includes(skill) && !preferredSkills.includes(skill)
  );

  // Enhanced experience descriptions with job-specific achievements
  const enhancedExperience = experience.map((exp, index) => {
    const baseAchievements = exp.achievements && exp.achievements.length > 0
      ? exp.achievements
      : [
          'Delivered high-quality results and consistently exceeded performance targets',
          'Collaborated effectively with cross-functional teams to drive project success',
          'Applied technical expertise to solve complex challenges and improve processes'
        ];

    // Add 2-3 more detailed achievements for recent roles
    const additionalAchievements = index < 2 ? [
      `Successfully implemented solutions using ${analysis.requiredSkills.slice(0, 2).join(' and ')} technologies`,
      `Contributed to ${analysis.keyRequirements[0]?.toLowerCase() || 'project objectives'} with measurable impact on team productivity`,
      `Demonstrated expertise in ${analysis.responsibilities?.[0]?.toLowerCase() || 'key responsibilities'} while maintaining high quality standards`
    ] : [];

    const allAchievements = [...baseAchievements, ...additionalAchievements];

    return `${exp.position} | ${exp.company} | ${exp.location}
${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}

${exp.description}

Key Achievements:
${allAchievements.slice(0, index < 2 ? 6 : 4).map(achievement => `• ${achievement}`).join('\n')}`;
  });

  return `${personalInfo.firstName} ${personalInfo.lastName}
${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}
${personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : ''}
${personalInfo.website ? `Portfolio: ${personalInfo.website}` : ''}

PROFESSIONAL SUMMARY
${professionalSummary}

CORE COMPETENCIES
${relevantSkills.length > 0 ? `Primary Skills: ${relevantSkills.slice(0, 8).map(skill => skill.name).join(' • ')}` : ''}
${preferredSkills.length > 0 ? `Additional Skills: ${preferredSkills.slice(0, 6).map(skill => skill.name).join(' • ')}` : ''}
${otherSkills.length > 0 ? `Other Proficiencies: ${otherSkills.slice(0, 4).map(skill => skill.name).join(' • ')}` : ''}

PROFESSIONAL EXPERIENCE

${enhancedExperience.join('\n\n')}

EDUCATION

${education.map(edu => `${edu.degree} in ${edu.field}
${edu.institution} | ${edu.location} | ${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
${edu.achievements && edu.achievements.length > 0 ? edu.achievements.map(a => `• ${a}`).join('\n') : ''}`).join('\n\n')}
`;
}

function generateTailoredCoverLetter(profile: UserProfile, jobTitle: string, companyName: string, analysis: JobAnalysis): string {
  const { personalInfo, experience } = profile;
  const topExperience = experience[0];

  return `Dear ${companyName} Hiring Team,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. With my background in ${topExperience ? topExperience.position : 'professional development'} and proven expertise in ${analysis.requiredSkills.slice(0, 3).join(', ')}, I am excited about the opportunity to contribute to your team's success.

In my ${topExperience ? `role as ${topExperience.position} at ${topExperience.company}` : 'professional experience'}, I have developed strong capabilities that directly align with your requirements. ${topExperience ? topExperience.description : 'I have consistently delivered high-quality results and contributed to team objectives.'} This experience has prepared me to excel in the ${jobTitle} role, particularly in areas such as ${analysis.keyRequirements.slice(0, 2).join(' and ')}.

What particularly excites me about this opportunity at ${companyName} is the chance to apply my skills in ${analysis.requiredSkills.slice(0, 2).join(' and ')} while contributing to your organization's growth and innovation. I am confident that my proven track record of ${topExperience && topExperience.achievements && topExperience.achievements.length > 0
  ? topExperience.achievements[0].toLowerCase()
  : 'delivering results and exceeding expectations'} makes me an ideal candidate for this position.

I would welcome the opportunity to discuss how my experience and enthusiasm can contribute to ${companyName}'s continued success. Thank you for considering my application, and I look forward to hearing from you.

Sincerely,
${personalInfo.firstName} ${personalInfo.lastName}`;
}

function getRoleSummary(jobTitle: string, experience: any[], analysis: JobAnalysis): string {
  const yearsExp = experience.length;
  const topRole = experience[0];

  return `Results-driven ${analysis.roleLevel}-level professional with ${yearsExp > 0 ? `${yearsExp}+` : 'relevant'} years of experience in ${analysis.industryType.toLowerCase()} and related fields. ${topRole ? `Currently serving as ${topRole.position} with expertise in ${analysis.requiredSkills.slice(0, 3).join(', ')}.` : `Skilled in ${analysis.requiredSkills.slice(0, 3).join(', ')}.`} Proven track record of delivering exceptional results and driving organizational success. Seeking to leverage comprehensive skill set and passion for innovation in the ${jobTitle} role.`;
}