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

    DETAILED EXPERIENCE (MUST include all company names and dates prominently, most recent first):
    ${[...profile.experience].sort((a, b) => {
      // Current roles first
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      // Then sort by start date (most recent first)
      const dateA = new Date(a.startDate || '1900-01-01');
      const dateB = new Date(b.startDate || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    }).map(exp => `
    Position: ${exp.jobTitle || exp.position || 'Job Title'}
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
       - Format as: Job Title, Company Name | Location, Start Date - End Date
       - NO markdown formatting (no ** or * characters)
       - Include full employment dates (month/year format)
       - Write compelling bullet points (4-6 per role for most recent)
       - Start each bullet with strong action verbs
       - Quantify achievements with specific metrics where possible
       - Highlight responsibilities that align with target role
       - Use keywords from job description naturally
       - Show progression and growth
       - List most recent experience FIRST

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

    CRITICAL FORMATTING REQUIREMENTS:
    - ALWAYS include company names prominently for each position
    - ALWAYS include employment dates (start and end dates)
    - Format experience entries as: Job Title, Company Name | Location, Month Year - Month Year
    - NO markdown formatting (no ** or * characters at all)
    - Company names and dates MUST be clearly visible and prominent
    - This is essential information that recruiters need to see immediately
    - List most recent experience FIRST

    EXAMPLE FORMAT:
    Senior Software Engineer
    Google Inc. | Mountain View, CA
    January 2020 - Present

    • Developed scalable web applications using React and Node.js
    • Led a team of 5 engineers to deliver critical features on time

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

  // Generate highly targeted and compelling cover letter
  const coverLetterPrompt = `
    Write an exceptional, highly personalized cover letter that will make the hiring manager excited to interview this candidate. This should be a strategic document that demonstrates clear value alignment and compelling qualifications.

    POSITION DETAILS:
    Job Title: ${jobTitle}
    Company: ${companyName}
    Applicant: ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}

    JOB REQUIREMENTS TO ADDRESS:
    Key Requirements: ${analysis.keyRequirements?.join(' • ') || 'Role requirements'}
    Required Skills: ${analysis.requiredSkills?.join(', ') || 'Technical skills'}
    Preferred Skills: ${analysis.preferredSkills?.join(', ') || 'Additional skills'}
    Company Info: ${analysis.companyInfo || 'Growing organization'}
    Industry: ${analysis.industryType || 'Professional services'}
    Role Level: ${analysis.roleLevel || 'mid'}

    CANDIDATE BACKGROUND TO LEVERAGE:
    Professional Overview: ${profile.personalInfo.professionalOverview || 'Professional with relevant experience'}

    Most Recent Experience:
    ${[...profile.experience].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      const dateA = new Date(a.startDate || '1900-01-01');
      const dateB = new Date(b.startDate || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 3).map(exp => `
    • ${exp.jobTitle || exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})
      ${exp.description}
      Key achievements: ${exp.achievements?.slice(0, 2).join(' | ') || 'Delivered exceptional results'}
    `).join('')}

    Relevant Skills: ${profile.skills.map(skill => `${skill.name} (${skill.level})`).join(', ')}

    FORMATTING REQUIREMENTS:
    Start with proper business letter formatting:
    - Applicant's full name as header
    - Contact information (location, email, phone, LinkedIn if available, portfolio if available)
    - Current date
    - Company name and "Re: [Job Title] Position"
    - Proper salutation

    WRITING INSTRUCTIONS:
    Create a compelling 4-paragraph cover letter that:

    PARAGRAPH 1 - COMPELLING OPENING:
    - Open with genuine enthusiasm for the specific role and company
    - Immediately establish credibility with your most relevant qualification
    - Reference specific aspects of the company or role that appeal to you
    - Create a strong hook that makes them want to keep reading

    PARAGRAPH 2 - DIRECT QUALIFICATION MATCH:
    - Address the top 3-4 key requirements from the job posting with clear, readable flow
    - Use varied sentence structure and smooth transitions between points
    - Provide specific examples with concrete metrics and achievements
    - Break up dense content into digestible, well-connected sentences
    - Include relevant keywords naturally without stuffing
    - Show progression and growth in your career
    - Ensure professional readability similar to Grammarly-polished content

    PARAGRAPH 3 - VALUE PROPOSITION & COMPANY ALIGNMENT:
    - Demonstrate understanding of the company's goals, values, or challenges
    - Explain how your unique background/perspective adds value beyond basic qualifications
    - Connect your past achievements to potential future contributions
    - Show how you align with company culture and mission
    - Address any preferred skills or bonus qualifications you possess

    PARAGRAPH 4 - CONFIDENT CLOSE:
    - Reinforce your enthusiasm and fit for the role
    - Reference next steps or express eagerness to discuss further
    - Thank them professionally
    - End with confidence, not desperation

    TONE & STYLE REQUIREMENTS:
    - Professional yet personable and authentic
    - Confident without being arrogant
    - Specific and metrics-driven rather than generic
    - Forward-looking and solution-oriented
    - Demonstrate genuine research and interest in the company
    - Use active voice and strong action verbs
    - Avoid clichés and generic phrases
    - Write with excellent flow and readability (Grammarly-level polish)
    - Use varied sentence lengths and smooth transitions
    - Ensure each paragraph flows naturally to the next
    - Break up complex ideas into clear, digestible sentences

    CRITICAL REQUIREMENTS:
    - Address specific job requirements with concrete examples
    - Include relevant metrics and achievements where possible
    - Show clear understanding of the role and company
    - Demonstrate value beyond just meeting basic qualifications
    - Make it easy to see why you're the ideal candidate
    - Keep it concise but substantive (under 400 words)

    IMPORTANT: Return ONLY the complete cover letter content. No explanations or meta-commentary. The output must be ready to send directly to a hiring manager and should make them excited to interview this candidate.
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
  const originalDesc = jobDescription;

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

  // Enhanced key requirements extraction
  const keyRequirements = [];

  // Extract specific requirements from job description
  const requirementIndicators = [
    /required?:?\s*([^.!?\n]{10,100})/gi,
    /must have:?\s*([^.!?\n]{10,100})/gi,
    /essential:?\s*([^.!?\n]{10,100})/gi,
    /looking for:?\s*([^.!?\n]{10,100})/gi,
    /candidate will:?\s*([^.!?\n]{10,100})/gi,
    /responsibilities include:?\s*([^.!?\n]{10,100})/gi
  ];

  requirementIndicators.forEach(pattern => {
    const matches = [...originalDesc.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].trim().length > 10) {
        keyRequirements.push(match[1].trim());
      }
    });
  });

  // Add standard requirements if we didn't extract enough specific ones
  const standardRequirements = [
    `Experience in ${jobTitle.toLowerCase()} or similar role`,
    'Strong technical and analytical skills',
    'Excellent communication and collaboration abilities',
    'Problem-solving and critical thinking skills',
    'Ability to work independently and in team environments'
  ];

  if (requiredSkills.length > 0) {
    standardRequirements.unshift(`Proficiency in ${requiredSkills.slice(0, 3).join(', ')}`);
  }

  // Fill out requirements with standards if needed
  while (keyRequirements.length < 5) {
    const nextStandard = standardRequirements[keyRequirements.length];
    if (nextStandard && !keyRequirements.some(req => req.toLowerCase().includes(nextStandard.toLowerCase().substring(0, 10)))) {
      keyRequirements.push(nextStandard);
    } else {
      break;
    }
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

  // Determine industry with more nuance
  let industryType = 'Technology';
  if (desc.includes('healthcare') || desc.includes('medical') || desc.includes('hospital')) industryType = 'Healthcare';
  else if (desc.includes('finance') || desc.includes('banking') || desc.includes('fintech')) industryType = 'Finance';
  else if (desc.includes('education') || desc.includes('teaching') || desc.includes('university')) industryType = 'Education';
  else if (desc.includes('marketing') || desc.includes('advertising') || desc.includes('digital marketing')) industryType = 'Marketing';
  else if (desc.includes('retail') || desc.includes('e-commerce') || desc.includes('sales')) industryType = 'Retail';
  else if (desc.includes('manufacturing') || desc.includes('automotive')) industryType = 'Manufacturing';
  else if (desc.includes('consulting') || desc.includes('advisory')) industryType = 'Consulting';

  // Extract soft skills mentioned in job description
  const softSkills = [
    'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical',
    'critical thinking', 'creativity', 'adaptability', 'time management', 'organization',
    'initiative', 'collaboration', 'innovation', 'strategic thinking', 'detail-oriented'
  ].filter(skill => desc.includes(skill));

  // Extract experience requirements
  const yearMatches = desc.match(/(\d+)\+?\s*years?/g);
  const experienceYears = yearMatches ? yearMatches[0] : 'Relevant experience required';

  // Enhanced company information extraction
  let companyInfo = 'Dynamic organization offering growth opportunities';

  // Look for company culture/values indicators
  const cultureIndicators = [
    'innovative', 'leading', 'growing', 'established', 'startup', 'enterprise',
    'collaborative', 'diverse', 'inclusive', 'customer-focused', 'mission-driven',
    'fast-paced', 'agile', 'cutting-edge', 'industry leader', 'market leader',
    'values', 'culture', 'mission', 'vision', 'commitment to'
  ];

  const foundCultureWords = cultureIndicators.filter(indicator => desc.includes(indicator));
  if (foundCultureWords.length > 0) {
    const primaryCulture = foundCultureWords.slice(0, 3).join(', ');
    companyInfo = `${primaryCulture.charAt(0).toUpperCase() + primaryCulture.slice(1)} organization focused on excellence and growth`;
  }

  // Look for specific company goals or initiatives
  if (desc.includes('digital transformation')) {
    companyInfo = 'Forward-thinking organization driving digital transformation initiatives';
  } else if (desc.includes('sustainability') || desc.includes('environmental')) {
    companyInfo = 'Purpose-driven organization committed to sustainability and positive impact';
  } else if (desc.includes('scale') || desc.includes('scaling')) {
    companyInfo = 'High-growth organization focused on scaling operations and expanding market presence';
  } else if (desc.includes('innovation') && desc.includes('customer')) {
    companyInfo = 'Customer-centric organization driving innovation and delivering exceptional experiences';
  }

  // Extract common responsibilities keywords
  const responsibilityKeywords = [
    'develop', 'design', 'implement', 'maintain', 'collaborate', 'lead', 'manage',
    'analyze', 'optimize', 'troubleshoot', 'document', 'test', 'deploy', 'coordinate',
    'execute', 'deliver', 'support', 'monitor', 'evaluate', 'improve'
  ];
  const responsibilities = responsibilityKeywords.filter(resp => desc.includes(resp))
    .map(resp => `${resp.charAt(0).toUpperCase() + resp.slice(1)} innovative solutions and drive results`);

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
    companyInfo,
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
    analysis.requiredSkills && analysis.requiredSkills.some(req =>
      req.toLowerCase().includes(skill.name.toLowerCase()) ||
      skill.name.toLowerCase().includes(req.toLowerCase())
    )
  );

  // Enhanced professional summary using professional overview if available
  const professionalSummary = personalInfo.professionalOverview ||
    getRoleSummary(jobTitle, experience, analysis);

  // Categorize skills for better presentation
  const preferredSkills = skills.filter(skill =>
    analysis.preferredSkills && analysis.preferredSkills.some(pref =>
      pref.toLowerCase().includes(skill.name.toLowerCase()) ||
      skill.name.toLowerCase().includes(pref.toLowerCase())
    )
  );

  const otherSkills = skills.filter(skill =>
    !relevantSkills.includes(skill) && !preferredSkills.includes(skill)
  );

  // Enhanced experience descriptions with job-specific achievements
  // Sort experience by most recent first (current roles first, then by start date)
  const sortedExperience = [...experience].sort((a, b) => {
    // Current roles first
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;

    // Then sort by start date (most recent first)
    const dateA = new Date(a.startDate || '1900-01-01');
    const dateB = new Date(b.startDate || '1900-01-01');
    return dateB.getTime() - dateA.getTime();
  });

  const enhancedExperience = sortedExperience.map((exp, index) => {
    const baseAchievements = exp.achievements && exp.achievements.length > 0
      ? exp.achievements
      : [
          'Delivered high-quality results and consistently exceeded performance targets',
          'Collaborated effectively with cross-functional teams to drive project success',
          'Applied technical expertise to solve complex challenges and improve processes'
        ];

    // Add 2-3 more detailed achievements for recent roles
    const additionalAchievements = index < 2 ? [
      `Successfully implemented solutions using ${(analysis.requiredSkills && analysis.requiredSkills.length > 0) ? analysis.requiredSkills.slice(0, 2).join(' and ') : 'modern'} technologies`,
      `Contributed to ${(analysis.keyRequirements && analysis.keyRequirements.length > 0) ? analysis.keyRequirements[0].toLowerCase() : 'project objectives'} with measurable impact on team productivity`,
      `Demonstrated expertise in ${(analysis.responsibilities && analysis.responsibilities.length > 0) ? analysis.responsibilities[0].toLowerCase() : 'key responsibilities'} while maintaining high quality standards`
    ] : [];

    const allAchievements = [...baseAchievements, ...additionalAchievements];

    // Format dates properly
    const startDate = exp.startDate || 'Start Date';
    const endDate = exp.current ? 'Present' : (exp.endDate || 'End Date');

    // Remove markdown formatting - use plain text
    return `${exp.jobTitle || exp.position || 'Position'}
${exp.company || 'Company'} | ${exp.location || 'Location'}
${startDate} - ${endDate}

${exp.description || 'Responsible for key duties and delivering results in this role.'}

Key Achievements:
${allAchievements.slice(0, index < 2 ? 6 : 4).map(achievement => `• ${achievement}`).join('\n')}`;
  });

  // Build skills sections with proper fallbacks
  const buildSkillsSection = () => {
    const sections = [];

    if (relevantSkills.length > 0) {
      sections.push(`Primary Skills: ${relevantSkills.slice(0, 8).map(skill => skill.name).join(' • ')}`);
    }

    if (preferredSkills.length > 0) {
      sections.push(`Additional Skills: ${preferredSkills.slice(0, 6).map(skill => skill.name).join(' • ')}`);
    }

    if (otherSkills.length > 0) {
      sections.push(`Other Proficiencies: ${otherSkills.slice(0, 4).map(skill => skill.name).join(' • ')}`);
    }

    // If no categorized skills, just list all skills
    if (sections.length === 0 && skills.length > 0) {
      sections.push(`Technical Skills: ${skills.slice(0, 12).map(skill => skill.name).join(' • ')}`);
    }

    return sections.join('\n');
  };

  // Build education section with proper formatting
  const buildEducationSection = () => {
    if (education.length === 0) {
      return 'Education details available upon request';
    }

    return education.map(edu => {
      const degree = edu.degree || 'Degree';
      const field = edu.field || 'Field of Study';
      const institution = edu.institution || 'Institution';
      const location = edu.location || 'Location';
      const startDate = edu.startDate || 'Start Date';
      const endDate = edu.current ? 'Present' : (edu.endDate || 'End Date');

      let eduSection = `${degree} in ${field}\n${institution} | ${location} | ${startDate} - ${endDate}`;

      if (edu.gpa) {
        eduSection += `\nGPA: ${edu.gpa}`;
      }

      if (edu.achievements && edu.achievements.length > 0) {
        eduSection += '\n' + edu.achievements.map(a => `• ${a}`).join('\n');
      }

      return eduSection;
    }).join('\n\n');
  };

  return `${personalInfo.firstName} ${personalInfo.lastName}
${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}
${personalInfo.linkedin ? `LinkedIn: ${personalInfo.linkedin}` : ''}
${personalInfo.website ? `Portfolio: ${personalInfo.website}` : ''}

PROFESSIONAL SUMMARY
${professionalSummary}

CORE COMPETENCIES
${buildSkillsSection()}

PROFESSIONAL EXPERIENCE

${enhancedExperience.join('\n\n')}

EDUCATION

${buildEducationSection()}
`;
}

function generateTailoredCoverLetter(profile: UserProfile, jobTitle: string, companyName: string, analysis: JobAnalysis): string {
  const { personalInfo, experience, skills } = profile;

  // Sort experience to get most recent/relevant first
  const sortedExperience = [...experience].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    const dateA = new Date(a.startDate || '1900-01-01');
    const dateB = new Date(b.startDate || '1900-01-01');
    return dateB.getTime() - dateA.getTime();
  });

  const topExperience = sortedExperience[0];
  const secondExperience = sortedExperience[1];

  // Find skills that match job requirements
  const matchingSkills = skills.filter(skill =>
    analysis.requiredSkills.some(req =>
      req.toLowerCase().includes(skill.name.toLowerCase()) ||
      skill.name.toLowerCase().includes(req.toLowerCase())
    )
  );

  // Get relevant achievements
  const topAchievements = topExperience?.achievements || [];
  const secondAchievements = secondExperience?.achievements || [];
  const allAchievements = [...topAchievements, ...secondAchievements];

  // Build professional letter header with personal information
  const letterHeader = `${personalInfo.firstName} ${personalInfo.lastName}
${personalInfo.location || 'Available upon request'}
${personalInfo.email}${personalInfo.phone ? ` | ${personalInfo.phone}` : ''}${personalInfo.linkedin ? `
LinkedIn: ${personalInfo.linkedin}` : ''}${personalInfo.website ? `
Portfolio: ${personalInfo.website}` : ''}

${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

${companyName} Hiring Team
Re: ${jobTitle} Position`;

  // Build compelling opening that establishes immediate credibility
  const opening = `Dear ${companyName} Hiring Team,

I am excited to apply for the ${jobTitle} position at ${companyName}. As a ${analysis.roleLevel}-level professional with ${experience.length > 0 ? `${Math.max(1, experience.length)}+ years` : 'relevant experience'} in ${analysis.industryType.toLowerCase()}, I bring exactly the combination of ${analysis.requiredSkills.slice(0, 2).join(' and ')} expertise that your role demands. ${personalInfo.professionalOverview ? personalInfo.professionalOverview.replace(/\.$/, '') + ', and I' : 'I'} am particularly drawn to ${companyName}'s ${analysis.companyInfo.includes('innovative') || analysis.companyInfo.includes('leading') ? 'innovative approach' : 'commitment to excellence'} in the ${analysis.industryType.toLowerCase()} space.`;

  // Build clear, readable qualification match paragraphs
  const qualificationParts = [];

  // Opening statement about alignment
  qualificationParts.push(`Your requirements for ${analysis.keyRequirements.slice(0, 3).join(', ').toLowerCase()} align perfectly with my background.`);

  // Current role experience
  if (topExperience) {
    qualificationParts.push(`In my current role as ${topExperience.jobTitle || topExperience.position} at ${topExperience.company}, I have ${topExperience.description || 'consistently delivered exceptional results'}.`);
  } else {
    qualificationParts.push(`Throughout my professional experience, I have developed strong capabilities in these areas.`);
  }

  // Achievement example
  if (topAchievements.length > 0) {
    qualificationParts.push(`This includes achieving notable results such as ${topAchievements[0].toLowerCase().replace(/^[A-Z]/, char => char.toLowerCase())}.`);
  }

  // Technical skills alignment
  if (matchingSkills.length > 0) {
    qualificationParts.push(`My proficiency in ${matchingSkills.slice(0, 3).map(s => s.name).join(', ')} directly supports your technical requirements.`);
    qualificationParts.push(`Additionally, my experience with ${analysis.requiredSkills.slice(0, 2).join(' and ')} ensures I can contribute immediately to your team's objectives.`);
  } else {
    qualificationParts.push(`This experience has equipped me with the technical and analytical skills essential for success in your ${jobTitle} role.`);
  }

  const qualificationMatch = qualificationParts.join(' ');

  // Build value proposition that shows company alignment and unique value
  const valueProposition = `What sets me apart as a candidate is my ability to ${analysis.responsibilities && analysis.responsibilities.length > 0 ? analysis.responsibilities[0].toLowerCase() : 'deliver innovative solutions'} while maintaining focus on ${analysis.industryType.toLowerCase() === 'technology' ? 'scalability and user experience' : 'operational excellence and stakeholder satisfaction'}. ${secondExperience ?
    `My previous experience at ${secondExperience.company} as ${secondExperience.jobTitle || secondExperience.position} further strengthened my capabilities in ${analysis.preferredSkills.slice(0, 2).join(' and ')}, ` :
    'My diverse background has prepared me to '}${allAchievements.length > 1 ?
    `which resulted in ${allAchievements[1].toLowerCase().replace(/^[A-Z]/, char => char.toLowerCase())}. ` :
    'tackle complex challenges with innovative thinking. '}I am particularly excited about ${companyName}'s focus on ${analysis.companyInfo.includes('growth') ? 'growth and innovation' : analysis.companyInfo.includes('customer') ? 'customer success' : 'excellence and innovation'}, as this aligns with my passion for ${analysis.roleLevel === 'senior' || analysis.roleLevel === 'executive' ? 'driving strategic initiatives and leading high-performing teams' : 'contributing to meaningful projects and continuous learning'}.`;

  // Build confident close
  const confidentClose = `I am eager to bring my expertise in ${analysis.requiredSkills.slice(0, 2).join(' and ')} to help ${companyName} ${analysis.roleLevel === 'executive' ? 'achieve its strategic objectives' : analysis.roleLevel === 'senior' ? 'continue its growth trajectory' : 'reach new levels of success'}. Thank you for considering my application—I would welcome the opportunity to discuss how my proven track record of ${allAchievements.length > 0 ?
    allAchievements[0].toLowerCase().replace(/^[A-Z]/, char => char.toLowerCase()) :
    'delivering exceptional results and driving innovation'} can contribute to your team's continued success.

Sincerely,
${personalInfo.firstName} ${personalInfo.lastName}`;

  return `${letterHeader}

${opening}

${qualificationMatch}

${valueProposition}

${confidentClose}`;
}

function getRoleSummary(jobTitle: string, experience: any[], analysis: JobAnalysis): string {
  const yearsExp = experience.length;
  const topRole = experience[0];

  return `Results-driven ${analysis.roleLevel}-level professional with ${yearsExp > 0 ? `${yearsExp}+` : 'relevant'} years of experience in ${analysis.industryType.toLowerCase()} and related fields. ${topRole ? `Currently serving as ${topRole.jobTitle || topRole.position || 'professional'} with expertise in ${analysis.requiredSkills.slice(0, 3).join(', ')}.` : `Skilled in ${analysis.requiredSkills.slice(0, 3).join(', ')}.`} Proven track record of delivering exceptional results and driving organizational success. Seeking to leverage comprehensive skill set and passion for innovation in the ${jobTitle} role.`;
}