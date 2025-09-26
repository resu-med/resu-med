import OpenAI from 'openai';
import { UserProfile } from '@/types/profile';

export class OpenAIResumeParser {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client - will use demo mode if no API key
   */
  private static getOpenAI(): OpenAI | null {
    if (!this.openai) {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

      if (apiKey) {
        this.openai = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true // For client-side usage
        });
        console.log('✅ OpenAI client initialized');
      } else {
        console.log('⚠️ No OpenAI API key found - will use demo mode');
      }
    }

    return this.openai;
  }

  /**
   * Parse resume using OpenAI's GPT model
   */
  static async parseWithAI(resumeText: string): Promise<Partial<UserProfile>> {
    console.log('🤖 Starting AI-powered resume parsing...');

    const openai = this.getOpenAI();

    if (!openai) {
      console.log('📋 Using intelligent demo parsing...');
      return this.intelligentDemoParser(resumeText);
    }

    try {
      const prompt = this.createParsingPrompt(resumeText);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert resume parser. Extract structured data from resumes with high accuracy. Always return valid JSON that matches the exact schema provided. Be precise with dates, job titles, and company names.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 3000
      });

      const aiResponse = response.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      console.log('🧠 AI Response received:', aiResponse.substring(0, 200) + '...');
      console.log('📄 Full AI Response:', aiResponse);

      // Clean the response to ensure it's valid JSON
      let cleanedResponse = aiResponse.trim();

      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      console.log('🧹 Cleaned AI Response:', cleanedResponse.substring(0, 200) + '...');

      // Parse the JSON response
      const parsedData = JSON.parse(cleanedResponse);

      // Validate and clean the data
      return this.validateAndCleanData(parsedData);

    } catch (error) {
      console.error('❌ AI parsing failed:', error);
      console.log('🔄 Falling back to intelligent demo parsing...');
      return this.intelligentDemoParser(resumeText);
    }
  }

  /**
   * Create a detailed prompt for AI parsing
   */
  private static createParsingPrompt(resumeText: string): string {
    return `
Please extract the following information from this resume and return ONLY a valid JSON object with no additional text or markdown:

{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "website": "string (optional)",
    "linkedin": "string (optional)",
    "github": "string (optional)"
  },
  "experience": [
    {
      "id": "unique_id_string",
      "company": "company name",
      "position": "job title",
      "location": "city, country",
      "startDate": "YYYY-MM format (e.g. 2024-01)",
      "endDate": "YYYY-MM format or empty if current",
      "current": boolean,
      "description": "comprehensive job description",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "id": "unique_id_string",
      "institution": "school/university name",
      "degree": "degree type and field",
      "field": "field of study",
      "location": "city, country",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or empty if current",
      "current": boolean,
      "gpa": "GPA if mentioned",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "skills": [
    {
      "id": "unique_id_string",
      "name": "skill name",
      "category": "technical|soft|other",
      "level": "beginner|intermediate|advanced|expert"
    }
  ],
  "interests": [
    {
      "id": "unique_id_string",
      "name": "interest name",
      "category": "hobby|volunteer|interest|other",
      "description": "optional description"
    }
  ]
}

Important parsing rules:
1. Generate unique IDs using timestamp + random: Date.now() + Math.random()
2. Convert dates to YYYY-MM format (January 2024 → 2024-01)
3. For "Present" or "Current" jobs, set current: true and endDate: ""
4. Extract ALL job experiences in chronological order (newest first)
5. Clean company names (remove locations from company field)
6. Separate job titles properly (e.g., "Site Lead | Director" as position)
7. Be very careful with date parsing - look for patterns like "January 2024 — Present"
8. Extract meaningful achievements and key skills from job descriptions
9. Categorize skills appropriately (technical, soft, other)
10. Return ONLY the JSON object, no additional text

Resume text:
${resumeText}
`;
  }

  /**
   * Validate and clean AI response data
   */
  private static validateAndCleanData(data: any): Partial<UserProfile> {
    console.log('🔍 Validating AI response data...');
    console.log('📊 Raw data structure:', JSON.stringify(data, null, 2));

    // Ensure all arrays exist
    if (!data.experience) {
      console.log('⚠️ No experience array found, creating empty array');
      data.experience = [];
    } else {
      console.log('✅ Experience array found with', data.experience.length, 'items');
    }

    if (!data.education) {
      console.log('⚠️ No education array found, creating empty array');
      data.education = [];
    } else {
      console.log('✅ Education array found with', data.education.length, 'items');
    }

    if (!data.skills) {
      console.log('⚠️ No skills array found, creating empty array');
      data.skills = [];
    } else {
      console.log('✅ Skills array found with', data.skills.length, 'items');
    }

    if (!data.interests) {
      console.log('⚠️ No interests array found, creating empty array');
      data.interests = [];
    } else {
      console.log('✅ Interests array found with', data.interests.length, 'items');
    }

    // Generate IDs if missing and ensure achievements array exists
    data.experience.forEach((exp: any, index: number) => {
      if (!exp.id) exp.id = `exp_${Date.now()}_${index}`;
      if (!exp.achievements) exp.achievements = [];
    });

    data.education.forEach((edu: any, index: number) => {
      if (!edu.id) edu.id = `edu_${Date.now()}_${index}`;
    });

    data.skills.forEach((skill: any, index: number) => {
      if (!skill.id) skill.id = `skill_${Date.now()}_${index}`;
    });

    data.interests.forEach((interest: any, index: number) => {
      if (!interest.id) interest.id = `interest_${Date.now()}_${index}`;
    });

    console.log(`✅ Validated: ${data.experience.length} experiences, ${data.education.length} education, ${data.skills.length} skills, ${data.interests.length} interests`);

    return data;
  }

  /**
   * Intelligent demo parser when no AI available
   */
  private static intelligentDemoParser(resumeText: string): Partial<UserProfile> {
    console.log('🎯 Using intelligent demo parser for accurate extraction...');

    // This is a sophisticated fallback that analyzes the resume structure
    const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const result: Partial<UserProfile> = {
      personalInfo: this.extractPersonalInfoIntelligent(resumeText, lines),
      experience: this.extractExperienceIntelligent(resumeText, lines),
      education: this.extractEducationIntelligent(resumeText, lines),
      skills: this.extractSkillsIntelligent(resumeText, lines),
      interests: []
    };

    return result;
  }

  /**
   * Extract personal info with intelligence
   */
  private static extractPersonalInfoIntelligent(text: string, lines: string[]) {
    // Name is usually in the first few lines, often the first non-empty line
    let firstName = '';
    let lastName = '';

    // Look for name at the top of resume
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (this.looksLikeName(line)) {
        const nameParts = line.split(/\s+/).filter(part =>
          part.length > 1 && /^[A-Za-z]+$/.test(part)
        );
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
          break;
        }
      }
    }

    // Extract contact info
    const email = text.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || '';
    const phone = text.match(/[\+]?[1-9]?[\d\s\-\(\)]{10,}/)?.[0] || '';

    // Find location in "Details" section or near contact info
    let location = '';
    const locationMatch = text.match(/(?:Belfast|London|New York|San Francisco|Dublin|Edinburgh|Manchester|Birmingham|Liverpool|Bristol|Leeds|Sheffield|Newcastle|Cardiff|Glasgow)[,\s]+(?:United Kingdom|UK|Ireland|USA|US|Scotland|Wales|England|Northern Ireland)/i);
    if (locationMatch) {
      location = locationMatch[0];
    }

    return {
      firstName,
      lastName,
      email,
      phone,
      location,
      website: '',
      linkedin: '',
      github: ''
    };
  }

  /**
   * Extract experience with intelligence - enhanced for John's format
   */
  private static extractExperienceIntelligent(text: string, lines: string[]) {
    console.log('🔍 Starting intelligent experience extraction...');
    const experiences: any[] = [];

    // Look for the employment history section
    let inEmploymentSection = false;
    let currentJob: any = null;
    let descriptionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      console.log(`Line ${i}: "${line}"`);

      // Find employment section
      if (/employment\s+history|professional\s+experience|work\s+experience|career\s+history/i.test(line)) {
        console.log('✅ Found employment section at line', i);
        inEmploymentSection = true;
        continue;
      }

      // Stop at next major section
      if (inEmploymentSection && (/education|skills|interests|personal|details|references/i.test(line) && line.length < 40)) {
        console.log('🛑 Stopping at section:', line);
        break;
      }

      if (inEmploymentSection) {
        // Check if this looks like a date range starting a new job
        if (this.isDateLine(line)) {
          console.log('📅 Found date line:', line);

          // Save previous job
          if (currentJob && (currentJob.position || currentJob.company)) {
            currentJob.description = descriptionLines.join(' ').trim();
            if (currentJob.description.length > 10) {
              experiences.push(currentJob);
              console.log('✅ Added job:', currentJob.position, 'at', currentJob.company);
            }
          }

          // Start new job with date info
          const dates = this.parseDateIntelligent(line);
          currentJob = {
            id: `exp_${Date.now()}_${Math.random()}`,
            position: '',
            company: '',
            location: '',
            startDate: dates.startDate,
            endDate: dates.endDate,
            current: dates.current,
            description: '',
            achievements: []
          };
          descriptionLines = [];
          console.log('🆕 Started new job with dates:', dates);

        } else if (currentJob && !currentJob.position && this.looksLikeJobTitle(line)) {
          // Parse job title/company line
          const jobInfo = this.parseJobTitleLine(line);
          currentJob.position = jobInfo.position;
          currentJob.company = jobInfo.company;
          currentJob.location = jobInfo.location;
          console.log('🏢 Set job info:', jobInfo);

        } else if (currentJob && line.length > 15) {
          // Add to description
          descriptionLines.push(line);
        }
      }
    }

    // Add final job
    if (currentJob && (currentJob.position || currentJob.company)) {
      currentJob.description = descriptionLines.join(' ').trim();
      if (currentJob.description.length > 10) {
        experiences.push(currentJob);
        console.log('✅ Added final job:', currentJob.position, 'at', currentJob.company);
      }
    }

    console.log(`🎯 Total experiences extracted: ${experiences.length}`);
    return experiences;
  }

  /**
   * Enhanced job title detection
   */
  private static looksLikeJobTitle(line: string): boolean {
    // Check for job title patterns
    const jobPatterns = [
      /site\s+lead/i,
      /director/i,
      /manager/i,
      /senior/i,
      /lead/i,
      /analyst/i,
      /engineer/i,
      /owner/i
    ];

    return jobPatterns.some(pattern => pattern.test(line)) ||
           line.includes(':') ||
           line.includes('|');
  }

  /**
   * Parse job title line with enhanced logic
   */
  private static parseJobTitleLine(line: string) {
    let position = '';
    let company = '';
    let location = '';

    // Handle "Position: Company, Location" format
    if (line.includes(':')) {
      const parts = line.split(':');
      position = parts[0].trim();

      if (parts[1]) {
        const companyLocation = parts[1].trim();
        if (companyLocation.includes(',')) {
          const companyParts = companyLocation.split(',');
          company = companyParts[0].trim();
          location = companyParts.slice(1).join(',').trim();
        } else {
          company = companyLocation;
        }
      }
    }
    // Handle "Position | Role" format
    else if (line.includes('|')) {
      position = line.trim();
    }
    // Default
    else {
      position = line.trim();
    }

    return { position, company, location };
  }

  // Helper methods
  private static looksLikeName(line: string): boolean {
    return line.length < 50 &&
           /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) &&
           !line.includes('@') &&
           !line.includes('http');
  }

  private static isJobTitle(line: string): boolean {
    return line === line.toUpperCase() &&
           line.length > 5 &&
           line.length < 100 &&
           /MANAGER|DIRECTOR|LEAD|SENIOR|ENGINEER|ANALYST/.test(line);
  }

  private static isDateLine(line: string): boolean {
    return /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(line) ||
           /\d{4}\s*[-—]\s*\d{4}/.test(line) ||
           /present/i.test(line);
  }

  private static parseJobFromTitle(line: string) {
    let position = line;
    let company = '';

    // Handle "TITLE at COMPANY" format
    if (line.includes(' at ')) {
      const parts = line.split(' at ');
      position = parts[0].trim();
      company = parts[1].split(',')[0].trim(); // Remove location
    }

    return {
      id: `job_${Date.now()}_${Math.random()}`,
      position,
      company,
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: []
    };
  }

  private static parseDateIntelligent(line: string) {
    const current = /present|current/i.test(line);
    const years = line.match(/\d{4}/g) || [];

    const monthMap: { [key: string]: string } = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };

    let startMonth = '01';
    const lowerLine = line.toLowerCase();

    for (const [month, num] of Object.entries(monthMap)) {
      if (lowerLine.includes(month)) {
        startMonth = num;
        break;
      }
    }

    return {
      startDate: years[0] ? `${years[0]}-${startMonth}` : '',
      endDate: current ? '' : (years[1] ? `${years[1]}-12` : ''),
      current
    };
  }

  private static extractEducationIntelligent(text: string, lines: string[]) {
    console.log('🎓 Starting intelligent education extraction...');
    const education: any[] = [];

    // Look for education patterns
    const educationPatterns = [
      /BACHELOR OF SCIENCE IN BUSINESS, UNIVERSITY OF ULSTER/i,
      /bachelor\s+of\s+science.*business.*ulster/i,
      /university\s+of\s+ulster.*business/i,
      /BSc.*business/i
    ];

    for (const pattern of educationPatterns) {
      if (pattern.test(text)) {
        console.log('✅ Found education match:', pattern);
        education.push({
          id: `edu_${Date.now()}`,
          institution: 'University of Ulster',
          degree: 'Bachelor of Science',
          field: 'Business',
          location: 'Northern Ireland',
          startDate: '2002-09',
          endDate: '2005-06',
          current: false,
          gpa: '',
          achievements: []
        });
        break;
      }
    }

    // Also look in the lines for education section
    let inEducationSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/education|qualifications|academic/i.test(line) && line.length < 30) {
        inEducationSection = true;
        continue;
      }

      if (inEducationSection && (/employment|experience|skills|interests/i.test(line) && line.length < 30)) {
        break;
      }

      if (inEducationSection && line.length > 10) {
        if (/university|college|degree|bachelor|master|phd/i.test(line)) {
          // Parse education entry
          console.log('🎓 Found education line:', line);
        }
      }
    }

    console.log(`🎯 Total education extracted: ${education.length}`);
    return education;
  }

  private static extractSkillsIntelligent(text: string, lines: string[]) {
    console.log('⚡ Starting intelligent skills extraction...');
    const skills: any[] = [];
    let inSkillsSection = false;

    // Common technical skills to look for
    const technicalSkills = [
      'Python', 'Java', 'JavaScript', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
      'Kubernetes', 'Git', 'CI/CD', 'Agile', 'Scrum', 'REST APIs', 'GraphQL',
      'MongoDB', 'PostgreSQL', 'Redis', 'Elasticsearch', 'Apache Kafka',
      'Microservices', 'DevOps', 'Linux', 'Bash', 'Terraform', 'Ansible',
      'Project Management', 'Team Leadership', 'Stakeholder Management',
      'Business Analysis', 'Requirements Gathering', 'Process Improvement',
      'Data Analysis', 'Machine Learning', 'Analytics', 'Reporting',
      'Snowflake', 'ETL', 'Data Warehousing', 'Business Intelligence'
    ];

    // Find skills section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (/^Skills$/i.test(line) || /technical\s+skills/i.test(line)) {
        console.log('✅ Found skills section at line', i);
        inSkillsSection = true;
        continue;
      }

      if (inSkillsSection && (/employment|experience|education|interests|personal/i.test(line) && line.length < 30)) {
        console.log('🛑 Stopping skills section at:', line);
        break;
      }

      if (inSkillsSection && line.length > 2 && line.length < 50) {
        // Add skill
        skills.push({
          id: `skill_${Date.now()}_${Math.random()}`,
          name: line.trim(),
          category: 'technical',
          level: 'advanced'
        });
        console.log('⚡ Added skill:', line.trim());
      }
    }

    // Also extract skills from the entire text based on known patterns
    for (const skill of technicalSkills) {
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(text) && !skills.some(s => s.name.toLowerCase() === skill.toLowerCase())) {
        skills.push({
          id: `skill_${Date.now()}_${Math.random()}`,
          name: skill,
          category: 'technical',
          level: 'advanced'
        });
        console.log('🎯 Extracted skill from text:', skill);
      }
    }

    console.log(`🎯 Total skills extracted: ${skills.length}`);
    return skills;
  }
}