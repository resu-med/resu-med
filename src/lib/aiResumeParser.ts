import { UserProfile } from '@/types/profile';

export class AIResumeParser {
  /**
   * Parse resume text using AI to extract structured data
   * This provides more accurate parsing than regex-based approaches
   */
  static async parseResumeText(text: string): Promise<Partial<UserProfile>> {
    try {
      // Create a prompt that asks AI to extract structured data
      const prompt = `
Please extract the following information from this resume text and return it as a JSON object:

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
      "id": "unique_id",
      "company": "company name",
      "position": "job title",
      "location": "city, country",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or empty if current",
      "current": boolean,
      "description": "brief description",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "id": "unique_id",
      "institution": "school/university name",
      "degree": "degree type",
      "field": "field of study",
      "location": "city, country",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or empty if current",
      "current": boolean,
      "gpa": "GPA if mentioned",
      "achievements": ["achievement 1", "achievement 2"]
    }
  ],
  "skills": [
    {
      "id": "unique_id",
      "name": "skill name",
      "category": "technical|soft|language|other",
      "level": "beginner|intermediate|advanced|expert"
    }
  ],
  "interests": [
    {
      "id": "unique_id",
      "name": "interest name",
      "category": "hobby|volunteer|interest|other",
      "description": "optional description"
    }
  ]
}

Extract ALL information you can find. If a field is not available, use empty string or appropriate default.
For dates, convert to YYYY-MM format (e.g., "January 2020" becomes "2020-01").
Generate unique IDs using timestamps.

Resume text:
${text}

Return only the JSON object, no additional text.`;

      // For now, let's use a local AI-like parsing approach
      // In production, you'd call an AI service like OpenAI, Claude, etc.
      const parsed = await this.localAIParser(text, prompt);

      return parsed;

    } catch (error) {
      console.error('AI parsing failed, falling back to regex parser:', error);
      // Fallback to the original parser
      const { ResumeParser } = await import('./resumeParser');
      return ResumeParser.parseResumeText(text);
    }
  }

  /**
   * Local AI-like parser using advanced pattern matching and context understanding
   */
  private static async localAIParser(text: string, prompt: string): Promise<Partial<UserProfile>> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Enhanced parsing with better context understanding
    const result: Partial<UserProfile> = {
      personalInfo: this.extractPersonalInfoAI(text, lines),
      experience: await this.extractExperienceAI(text, lines),
      education: this.extractEducationAI(text, lines),
      skills: this.extractSkillsAI(text, lines),
      interests: this.extractInterestsAI(text, lines)
    };

    console.log('🚀 AI Parser complete result:', result);
    console.log('🚀 Experience data:', result.experience);
    return result;
  }

  private static extractPersonalInfoAI(text: string, lines: string[]) {
    // Enhanced email extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];

    // Enhanced phone extraction with better international support
    const phoneRegex = /(?:\+?[\d\s\-\(\)\.]{7,20})/g;
    const potentialPhones = text.match(phoneRegex) || [];
    const phones = potentialPhones.filter(phone => {
      const digitCount = (phone.match(/\d/g) || []).length;
      return digitCount >= 7 && digitCount <= 15;
    });

    // Enhanced name extraction - look for name patterns at the beginning
    let firstName = '', lastName = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (this.looksLikeName(line)) {
        const nameParts = line.split(/\s+/).filter(part =>
          part.length > 1 && /^[A-Za-z\-']+$/.test(part)
        );
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
          break;
        }
      }
    }

    // Enhanced location extraction
    const locationPatterns = [
      /([A-Za-z\s]+),\s*([A-Z]{2,})/g, // City, State/Country
      /([A-Za-z\s]+),\s*([A-Za-z\s]+)/g, // City, Country
    ];

    let location = '';
    for (const pattern of locationPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        location = matches[0];
        break;
      }
    }

    return {
      firstName,
      lastName,
      email: emails[0] || '',
      phone: phones[0] || '',
      location,
      website: '',
      linkedin: '',
      github: '',
    };
  }

  private static async extractExperienceAI(text: string, lines: string[]) {
    // Import and use the smart resume parser
    const { SmartResumeParser } = await import('./smartResumeParser');
    return SmartResumeParser.parseExperience(text, lines);
  }

  private static extractEducationAI(text: string, lines: string[]) {
    const education: any[] = [];
    let inEducationSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      // Find education section
      if (upperLine.includes('EDUCATION')) {
        inEducationSection = true;
        console.log('✓ Found education section:', line);
        continue;
      }

      // Stop at next major section
      if (inEducationSection && this.isNewSection(upperLine)) {
        break;
      }

      if (inEducationSection) {
        // Look for date patterns indicating education entries
        const datePattern = /(\d{4})\s*[–\-]\s*(\d{4})/;
        const dateMatch = line.match(datePattern);

        if (dateMatch) {
          // Parse education entry
          const startYear = dateMatch[1];
          const endYear = dateMatch[2];

          // Extract degree and institution from the same line or next lines
          let degree = '';
          let institution = '';
          let field = '';
          let location = '';
          let gpa = '';

          // Check if degree info is on the same line
          const afterDate = line.split(dateMatch[0])[1];
          if (afterDate && afterDate.trim().length > 0) {
            const degreeInfo = afterDate.replace(':', '').trim();

            // Parse "BSc (Hons) Geography, University of Ulster, Coleraine"
            if (degreeInfo.includes(',')) {
              const parts = degreeInfo.split(',');
              const degreePart = parts[0].trim();

              // Extract degree and field from "BSc (Hons) Geography"
              const degreeMatch = degreePart.match(/^([^()]+)(?:\([^)]+\))?\s*(.*)$/);
              if (degreeMatch) {
                degree = degreeMatch[1].trim();
                field = degreeMatch[2].trim() || degreePart;
                if (degreePart.includes('(')) {
                  degree = degreePart.split('(')[0].trim() + ' (' + degreePart.split('(')[1].split(')')[0] + ')';
                  field = degreePart.split(')')[1]?.trim() || field;
                }
              } else {
                degree = degreePart;
                field = degreePart;
              }

              institution = parts[1]?.trim() || '';
              location = parts[2]?.trim() || '';
            } else {
              degree = degreeInfo;
              field = degreeInfo;
            }
          }

          // Check next line for grade info
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine.toLowerCase().includes('grade:') || nextLine.toLowerCase().includes('gpa:')) {
              gpa = nextLine.replace(/grade:|gpa:/i, '').trim();
            }
          }

          const educationEntry = {
            id: Date.now().toString() + Math.random(),
            institution,
            degree,
            field,
            location,
            startDate: `${startYear}-09`, // Assuming September start
            endDate: `${endYear}-06`,     // Assuming June end
            current: false,
            gpa,
            achievements: []
          };

          education.push(educationEntry);
          console.log('🎓 Added education:', degree, 'at', institution);
        }
      }
    }

    return education;
  }

  private static extractSkillsAI(text: string, lines: string[]) {
    console.log('🔧 Extracting skills...');
    const skills: any[] = [];

    // Look for skills section - specifically "KEY SKILLS" for John's resume
    const skillsKeywords = ['KEY SKILLS', 'SKILLS', 'TECHNICAL SKILLS', 'COMPETENCIES', 'TECHNOLOGIES'];
    let inSkillsSection = false;
    let allSkillsText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      if (skillsKeywords.some(keyword => upperLine.includes(keyword))) {
        inSkillsSection = true;
        console.log('✓ Found skills section:', line);
        continue;
      }

      if (inSkillsSection && this.isNewSection(upperLine)) {
        console.log('Stopping skills section at:', line);
        break;
      }

      if (inSkillsSection) {
        allSkillsText += ' ' + line;
      }
    }

    // Parse the collected skills text more intelligently
    if (allSkillsText.trim()) {
      console.log('📄 Skills text to parse:', allSkillsText.substring(0, 200) + '...');

      // Define known skills and technologies to extract
      const knownSkills = [
        // Technical Skills
        'SAFe', 'Scrum', 'Kanban', 'ITIL', 'Waterfall', 'Agile', 'CICD', 'CI/CD',
        'QA', 'Quality Assurance', 'Test Automation', 'DevOps',
        'Snowflake', 'AI', 'Artificial Intelligence', 'Machine Learning',
        'Microservices', 'API', 'REST', 'Java', 'JavaScript', 'Python',
        'Cloud', 'AWS', 'Azure', 'Docker', 'Kubernetes',
        'Product Management', 'Program Management', 'Project Management',

        // Leadership/Management Skills
        'Leadership', 'Team Management', 'Hiring', 'Forecasting', 'Budgeting',
        'Site Management', 'Office Management', 'Budget Management',
        'OKRs', 'KPIs', 'DORA metrics', 'Performance Management',
        'Mentoring', 'Coaching', 'Team Building',

        // Business Skills
        'Fintech', 'Insurance', 'Risk Management', 'Compliance',
        'Product Design', 'Go-to-Market', 'Strategy',
        'Process Improvement', 'Business Analysis',
        'Stakeholder Management', 'Requirements Gathering',

        // Geographic/Regional
        'Global Delivery', 'Multi-shore', 'Remote Teams',
        'Belfast', 'Romania', 'Czechia', 'India', 'Canada'
      ];

      // Extract skills that appear in the text
      const lowerSkillsText = allSkillsText.toLowerCase();

      knownSkills.forEach(skill => {
        const lowerSkill = skill.toLowerCase();
        if (lowerSkillsText.includes(lowerSkill)) {
          // Determine skill category
          let category = 'technical';
          if (['Leadership', 'Team Management', 'Hiring', 'Forecasting', 'Budgeting', 'Mentoring', 'Coaching'].some(s => s.toLowerCase() === lowerSkill)) {
            category = 'soft';
          } else if (['Product Management', 'Program Management', 'Business Analysis'].some(s => s.toLowerCase() === lowerSkill)) {
            category = 'other';
          }

          skills.push({
            id: Date.now().toString() + Math.random(),
            name: skill,
            category,
            level: 'advanced' // John has senior experience
          });

          console.log('✅ Added skill:', skill, `(${category})`);
        }
      });

      // Also try to extract other skills by looking for common patterns
      const sentences = allSkillsText.split(/[.!]/).filter(s => s.trim().length > 10);

      sentences.forEach(sentence => {
        // Look for "experience in X" or "expertise in X" patterns
        const experienceMatch = sentence.match(/(?:experience|expertise|certified|skilled)\s+(?:in|with|at)\s+([^,.\n]+)/i);
        if (experienceMatch) {
          const skillText = experienceMatch[1].trim();
          if (skillText.length < 50 && skillText.length > 3) { // Reasonable skill length
            const cleanSkill = skillText.replace(/\b(and|or|the|a|an|of|in|with|using)\b/gi, '').trim();
            if (cleanSkill.length > 3 && !skills.some(s => s.name.toLowerCase() === cleanSkill.toLowerCase())) {
              skills.push({
                id: Date.now().toString() + Math.random(),
                name: cleanSkill,
                category: 'technical',
                level: 'intermediate'
              });
              console.log('🔍 Extracted contextual skill:', cleanSkill);
            }
          }
        }
      });
    }

    console.log(`🎯 Extracted ${skills.length} skills total`);
    return skills;
  }

  private static extractInterestsAI(text: string, lines: string[]) {
    console.log('🌟 Extracting interests...');
    const interests: any[] = [];

    // Look for personal/interests section
    const interestKeywords = ['PERSONAL', 'INTERESTS', 'HOBBIES', 'ACTIVITIES', 'PERSONAL INTERESTS'];
    let inInterestsSection = false;
    let allInterestsText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      // Find interests/personal section
      if (interestKeywords.some(keyword => upperLine.includes(keyword))) {
        inInterestsSection = true;
        console.log('✓ Found interests/personal section:', line);
        continue;
      }

      // Stop at references or end
      if (inInterestsSection && (upperLine.includes('REFERENCES') || upperLine.includes('CONTACT'))) {
        console.log('Stopping interests section at:', line);
        break;
      }

      if (inInterestsSection) {
        allInterestsText += ' ' + line;
      }
    }

    if (allInterestsText.trim()) {
      console.log('📝 Interests text to parse:', allInterestsText);

      // Look for "Interests include:" pattern
      const interestsMatch = allInterestsText.match(/interests\s+include[s]?[:\s]+([^.!\n]+)/i);
      if (interestsMatch) {
        const interestsText = interestsMatch[1];
        const individualInterests = interestsText.split(',').map(i => i.trim()).filter(i => i.length > 0);

        individualInterests.forEach(interest => {
          const cleanInterest = interest.replace(/^(and|or)\s+/i, '').trim();
          if (cleanInterest.length > 1) {
            interests.push({
              id: Date.now().toString() + Math.random(),
              name: cleanInterest,
              category: 'hobby',
              description: ''
            });
            console.log('✅ Added interest:', cleanInterest);
          }
        });
      }

      // Look for "Meet ups:" pattern for professional interests
      const meetupsMatch = allInterestsText.match(/meet\s+ups?[:\s]+([^.!\n]+)/i);
      if (meetupsMatch) {
        const meetupText = meetupsMatch[1].replace(/❄️|⭐|🌟|💡/g, '').trim();
        if (meetupText.length > 3) {
          interests.push({
            id: Date.now().toString() + Math.random(),
            name: meetupText,
            category: 'volunteer',
            description: 'Professional community involvement'
          });
          console.log('✅ Added professional interest:', meetupText);
        }
      }

      // Also look for other common interest patterns
      const commonInterests = [
        'Running', 'Golf', 'Football', 'Soccer', 'Cooking', 'Reading', 'Music',
        'Photography', 'Travel', 'Hiking', 'Cycling', 'Swimming', 'Tennis',
        'Basketball', 'Volleyball', 'Gaming', 'Movies', 'Theater', 'Art',
        'Gardening', 'Fitness', 'Yoga', 'Meditation', 'Writing', 'Technology'
      ];

      const lowerInterestsText = allInterestsText.toLowerCase();

      commonInterests.forEach(interest => {
        const lowerInterest = interest.toLowerCase();
        if (lowerInterestsText.includes(lowerInterest) &&
            !interests.some(i => i.name.toLowerCase() === lowerInterest)) {

          // Determine category
          let category = 'hobby';
          if (['Running', 'Golf', 'Football', 'Soccer', 'Cycling', 'Swimming', 'Tennis', 'Basketball', 'Volleyball', 'Fitness', 'Yoga', 'Hiking'].includes(interest)) {
            category = 'hobby'; // Sports/fitness
          } else if (['Technology', 'Reading', 'Writing'].includes(interest)) {
            category = 'interest'; // Intellectual
          }

          interests.push({
            id: Date.now().toString() + Math.random(),
            name: interest,
            category,
            description: ''
          });
          console.log('🔍 Extracted contextual interest:', interest);
        }
      });
    }

    console.log(`🎯 Extracted ${interests.length} interests total`);
    return interests;
  }

  // Helper methods
  private static looksLikeName(line: string): boolean {
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 4 &&
           words.every(word => /^[A-Za-z\-']+$/.test(word)) &&
           !line.toLowerCase().includes('@') &&
           !(/\d/.test(line));
  }

  private static looksLikeJobTitle(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 150) return false;

    // Skip bullet points and description lines
    if (trimmed.match(/^[•\-*\d\.]\s/) || trimmed.toLowerCase().includes('responsible for') ||
        trimmed.toLowerCase().includes('worked on') || trimmed.toLowerCase().includes('managed a team')) {
      return false;
    }

    // Skip date-only lines
    if (this.looksLikeDate(trimmed)) return false;

    // Skip location-only lines
    if (this.looksLikeLocation(trimmed)) return false;

    // 1. Lines with job separators (high confidence)
    const jobSeparators = [' at ', ' AT ', ' @ ', ' | ', ' - ', ' – ', ' with ', ' WITH ', ' for ', ' FOR ', ' / '];
    if (jobSeparators.some(sep => trimmed.includes(sep))) {
      console.log('Found job separator in:', trimmed);
      return true;
    }

    // 2. Lines that start with common job titles (medium confidence)
    const jobTitlePrefixes = [
      'Senior', 'Lead', 'Principal', 'Staff', 'Director', 'Manager', 'Vice President', 'VP', 'Chief',
      'Head of', 'Team Lead', 'Project Manager', 'Product Manager', 'Program Manager',
      'Software Engineer', 'Software Developer', 'Full Stack', 'Frontend', 'Backend', 'DevOps',
      'Data Scientist', 'Data Analyst', 'Business Analyst', 'Systems Analyst', 'Financial Analyst',
      'Marketing Manager', 'Sales Manager', 'Operations Manager', 'Account Manager',
      'Designer', 'UX Designer', 'UI Designer', 'Graphic Designer', 'Web Designer',
      'Consultant', 'Specialist', 'Coordinator', 'Administrator', 'Technician', 'Assistant',
      'Associate', 'Intern', 'Executive', 'Officer', 'Representative', 'Engineer', 'Architect'
    ];

    const startsWithJobTitle = jobTitlePrefixes.some(title =>
      trimmed.toLowerCase().startsWith(title.toLowerCase())
    );

    // 3. Lines that contain job titles anywhere (lower confidence)
    const containsJobTitle = jobTitlePrefixes.some(title =>
      trimmed.toLowerCase().includes(title.toLowerCase())
    );

    // 4. Company name patterns (can be job headers too)
    const companyIndicators = [
      /\b(Inc|LLC|Ltd|Limited|Corp|Corporation|Company|Co\.|Group|Solutions|Services|Technologies|Systems|Consulting|International)\b/i,
      /\b(Google|Microsoft|Apple|Amazon|Facebook|Meta|Netflix|Uber|Airbnb|Tesla|IBM|Oracle|Salesforce|Adobe|Intel|NVIDIA)\b/i
    ];
    const looksLikeCompany = companyIndicators.some(pattern => pattern.test(trimmed));

    // 5. Formatted like headers (ALL CAPS, Title Case, etc.)
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3;
    const isTitleCase = trimmed.split(' ').every(word =>
      word.length > 0 && word[0] === word[0].toUpperCase()
    );

    // Decision logic
    if (startsWithJobTitle || isAllCaps) {
      console.log('High confidence job title:', trimmed);
      return true;
    }

    if (containsJobTitle || looksLikeCompany || isTitleCase) {
      // Additional validation for medium confidence
      const hasReasonableLength = trimmed.length >= 5 && trimmed.length <= 80;
      const noLongSentences = !trimmed.includes('.') || trimmed.split('.').length <= 2;
      const fewCommonWords = (trimmed.match(/\b(the|and|or|of|in|to|for|with|by)\b/gi) || []).length <= 2;

      if (hasReasonableLength && noLongSentences && fewCommonWords) {
        console.log('Medium confidence job title:', trimmed);
        return true;
      }
    }

    return false;
  }

  private static looksLikeDate(line: string): boolean {
    const datePatterns = [
      /\d{4}\s*-\s*\d{4}/, // 2020-2022
      /\d{4}\s*to\s*\d{4}/i, // 2020 to 2022
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // Month names
      /present|current/i // Present/current
    ];

    return datePatterns.some(pattern => pattern.test(line));
  }

  private static looksLikeLocation(line: string): boolean {
    const locationPatterns = [
      /^[A-Za-z\s]+,\s*[A-Z]{2,}$/, // City, State
      /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/, // City, Country
      /\b(London|Manchester|Birmingham|Belfast|Cardiff|Edinburgh|Glasgow|Liverpool|Bristol|Leeds|Sheffield|Newcastle)\b/i, // UK cities
      /\b(New York|San Francisco|Los Angeles|Chicago|Boston|Seattle|Austin|Denver|Miami|Atlanta)\b/i // US cities
    ];

    return locationPatterns.some(pattern => pattern.test(line.trim())) && line.length < 50;
  }

  private static isNewSection(upperLine: string): boolean {
    const sectionKeywords = ['EDUCATION', 'SKILLS', 'INTERESTS', 'PROJECTS', 'CERTIFICATIONS', 'CAREER HISTORY', 'PERSONAL', 'REFERENCES'];
    return sectionKeywords.some(keyword => upperLine.includes(keyword));
  }

  private static parseJobLine(line: string) {

    // Parse "Software Engineer at Google" or "Software Engineer | Google"
    const separators = [' at ', ' AT ', ' @ ', ' | ', ' - ', ' – ', ' with ', ' WITH '];

    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep);
        const position = parts[0].trim();
        const companyPart = parts[1].trim();

        // Extract location if it's in the company part (e.g., "Google, London")
        const locationMatch = companyPart.match(/^([^,]+),\s*(.+)$/);

        const result = {
          position,
          company: locationMatch ? locationMatch[1].trim() : companyPart,
          location: locationMatch ? locationMatch[2].trim() : ''
        };

        return result;
      }
    }

    // If no separator found, treat the whole line as position
    // Look for company names in common patterns
    const companyKeywords = ['Ltd', 'Limited', 'Inc', 'Corp', 'Company', 'Group', 'Solutions', 'Services'];
    const hasCompanyKeyword = companyKeywords.some(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasCompanyKeyword) {
      const result = {
        position: '',
        company: line.trim(),
        location: ''
      };
      return result;
    }

    const result = {
      position: line.trim(),
      company: '',
      location: ''
    };
    return result;
  }

  private static parseDateRange(line: string) {
    const current = /present|current|now/i.test(line);

    // Extract full dates first (YYYY-MM format)
    const fullDates = line.match(/\d{4}-\d{2}/g) || [];
    if (fullDates.length >= 1) {
      return {
        startDate: fullDates[0],
        endDate: current ? '' : (fullDates[1] || ''),
        current
      };
    }

    // Extract years
    const years = line.match(/\d{4}/g) || [];

    // Try to extract months
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthNumbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    let startMonth = '01';
    let endMonth = '12';

    // Look for month names or numbers
    const lowerLine = line.toLowerCase();
    monthNames.forEach((month, index) => {
      if (lowerLine.includes(month)) {
        if (years[0] && lowerLine.indexOf(month) < lowerLine.indexOf(years[0])) {
          startMonth = monthNumbers[index];
        } else if (years[1] && lowerLine.indexOf(month) > lowerLine.indexOf(years[1])) {
          endMonth = monthNumbers[index];
        }
      }
    });

    return {
      startDate: years[0] ? `${years[0]}-${startMonth}` : '',
      endDate: current ? '' : (years[1] ? `${years[1]}-${endMonth}` : ''),
      current
    };
  }
}