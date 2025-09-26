import { UserProfile, Experience, Education, Skill, Interest } from '@/types/profile';

// Simple resume parsing using pattern matching
export class ResumeParser {
  private static extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  private static extractPhones(text: string): string[] {
    // Enhanced phone regex to catch more formats including UK/international
    const phoneRegex = /(\+?[\d\s-()]{7,20})/g;
    const potentialPhones = text.match(phoneRegex)?.map(p => p.trim()) || [];

    // Filter to avoid dates and other numbers - phones should have at least 7 digits
    return potentialPhones.filter(phone => {
      const digitCount = (phone.match(/\d/g) || []).length;
      return digitCount >= 7 && digitCount <= 15 &&
             !/^\d{4}$/.test(phone) && // Not a year
             !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(phone); // Not a date
    });
  }

  private static extractURLs(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  private static extractPersonalInfo(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const emails = this.extractEmails(text);
    const phones = this.extractPhones(text);
    const urls = this.extractURLs(text);

    console.log('Extracting personal info from lines:', lines.slice(0, 5)); // Debug
    console.log('Found emails:', emails, 'phones:', phones, 'urls:', urls); // Debug

    // Try to extract name (usually in the first few lines)
    let firstName = '';
    let lastName = '';

    // Look for name patterns in first 3 lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Skip lines that look like contact info or titles
      if (line.includes('@') || line.includes('http') || /^\d/.test(line)) continue;

      const nameParts = line.split(/\s+/).filter(part =>
        part.length > 1 &&
        /^[A-Za-z-']+$/.test(part) &&
        !['Email', 'Phone', 'Address', 'LinkedIn', 'GitHub', 'Resume', 'CV'].some(keyword =>
          part.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
        break;
      } else if (nameParts.length === 1 && !firstName) {
        firstName = nameParts[0];
      }
    }

    // Extract location (look for city, state patterns or standalone locations)
    let location = '';

    // Try to find location patterns in different ways
    const locationRegex1 = /([A-Za-z\s]+,\s*[A-Z]{2,})/; // City, STATE
    const locationRegex2 = /([A-Za-z\s]+,\s*[A-Za-z]{2,})/; // City, Country
    const locationRegex3 = /\b([A-Z][a-z]+,?\s*[A-Z][a-z]+)\b/; // Capitalized words

    const locationMatch1 = text.match(locationRegex1);
    const locationMatch2 = text.match(locationRegex2);
    const locationMatch3 = text.match(locationRegex3);

    if (locationMatch1) {
      location = locationMatch1[1];
    } else if (locationMatch2) {
      location = locationMatch2[1];
    } else if (locationMatch3) {
      location = locationMatch3[1];
    }

    // Try to find location in first few lines if not found
    if (!location) {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.includes(',') && !line.includes('@') && !line.includes('http') &&
            line.split(',').length === 2 && line.length < 50) {
          location = line;
          break;
        }
      }
    }

    // Categorize URLs
    let website = '';
    let linkedin = '';
    let github = '';

    urls.forEach(url => {
      if (url.toLowerCase().includes('linkedin')) {
        linkedin = url.startsWith('http') ? url : `https://${url}`;
      } else if (url.toLowerCase().includes('github')) {
        github = url.startsWith('http') ? url : `https://${url}`;
      } else if (!website && !url.includes('@')) {
        website = url.startsWith('http') ? url : `https://${url}`;
      }
    });

    const result = {
      firstName,
      lastName,
      email: emails[0] || '',
      phone: phones[0] || '',
      location,
      website,
      linkedin,
      github,
    };

    console.log('Extracted personal info:', result); // Debug

    return result;
  }

  private static createExperienceEntry(exp: Partial<Experience>): Experience {
    return {
      id: Date.now().toString() + Math.random(),
      company: exp.company || '',
      position: exp.position || '',
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      current: exp.current || false,
      description: exp.description || '',
      achievements: exp.achievements || [],
    };
  }

  private static extractExperienceWithoutSection(lines: string[]): Experience[] {
    const experiences: Experience[] = [];
    console.log('Trying to extract experience without section headers...');

    // Look for patterns like "Job Title at Company" or "Company - Job Title"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Pattern 1: "Job Title at Company"
      const atPattern = /^(.+?)\s+at\s+(.+?)(?:\s*[\|,]\s*(.+))?$/i;
      const atMatch = line.match(atPattern);

      if (atMatch && !line.includes('@') && !line.includes('http')) {
        const exp: Partial<Experience> = {
          position: atMatch[1].trim(),
          company: atMatch[2].trim(),
          location: atMatch[3]?.trim() || '',
          achievements: [],
          description: '',
        };

        // Look for dates in next few lines
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const dateLine = lines[j];
          const datePattern = /(\d{4}|\w+\s+\d{4}|\d{1,2}\/\d{4})[\s-]+(?:to\s+)?(\d{4}|\w+\s+\d{4}|present|current|\d{1,2}\/\d{4})/i;
          if (datePattern.test(dateLine)) {
            const dateMatch = dateLine.match(datePattern);
            if (dateMatch) {
              exp.startDate = this.formatDate(dateMatch[1]);
              const endDate = dateMatch[2].toLowerCase();
              exp.current = endDate.includes('present') || endDate.includes('current');
              exp.endDate = exp.current ? '' : this.formatDate(dateMatch[2]);
            }
            break;
          }
        }

        experiences.push(this.createExperienceEntry(exp));
        console.log('Found experience entry:', exp);
      }
    }

    return experiences;
  }

  private static extractExperience(text: string): Experience[] {
    const experiences: Experience[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('Extracting experience from text...'); // Debug

    // Look for experience sections - be more flexible
    const experienceKeywords = ['EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'PROFESSIONAL EXPERIENCE', 'CAREER HISTORY', 'WORK HISTORY'];
    let inExperienceSection = false;
    let currentExp: Partial<Experience> | null = null;
    let sectionStartIndex = -1;

    // First, find the experience section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (experienceKeywords.some(keyword => upperLine.includes(keyword))) {
        inExperienceSection = true;
        sectionStartIndex = i + 1;
        console.log('Found experience section at line:', i, line); // Debug
        break;
      }
    }

    if (!inExperienceSection) {
      // Try to find experience entries without explicit section header
      console.log('No explicit experience section found, looking for job patterns...');
      return this.extractExperienceWithoutSection(lines);
    }

    // Process the experience section
    for (let i = sectionStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      // Check if we're leaving experience section
      if (['EDUCATION', 'SKILLS', 'PROJECTS', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'SUMMARY', 'OBJECTIVE'].some(keyword => upperLine.includes(keyword))) {
        if (currentExp && (currentExp.position || currentExp.company)) {
          experiences.push(this.createExperienceEntry(currentExp));
        }
        break;
      }

      // Try to match job title and company patterns
      const jobPattern = /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[\|,]\s*(.+))?$/i;
      const datePattern = /(\d{4}|\w+\s+\d{4}|\d{1,2}\/\d{4})[\s-]+(?:to\s+)?(\d{4}|\w+\s+\d{4}|present|current|\d{1,2}\/\d{4})/i;

      // More restrictive pattern matching - must have "at" or "@", must not be dates or emails
      if (jobPattern.test(line) && !datePattern.test(line) && !line.includes('@') &&
          (line.toLowerCase().includes(' at ') || line.includes('@')) &&
          !line.match(/^\d+/) && line.length > 10) {
        // Save previous experience
        if (currentExp && (currentExp.position || currentExp.company)) {
          experiences.push(this.createExperienceEntry(currentExp));
        }

        // Start new experience
        const match = line.match(jobPattern);
        if (match) {
          currentExp = {
            position: match[1]?.trim() || '',
            company: match[2]?.trim() || '',
            location: match[3]?.trim() || '',
            achievements: [],
            description: '',
          };
          console.log('Found new experience entry:', currentExp);
        }
      } else if (currentExp && datePattern.test(line)) {
        // Extract dates
        const dateMatch = line.match(datePattern);
        if (dateMatch) {
          currentExp.startDate = this.formatDate(dateMatch[1]);
          const endDate = dateMatch[2].toLowerCase();
          currentExp.current = endDate.includes('present') || endDate.includes('current');
          currentExp.endDate = currentExp.current ? '' : this.formatDate(dateMatch[2]);
        }
      } else if (currentExp && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
        // Add bullet point as achievement
        const achievement = line.replace(/^[•\-*]\s*/, '').trim();
        if (achievement) {
          currentExp.achievements = currentExp.achievements || [];
          currentExp.achievements.push(achievement);
        }
      } else if (currentExp && line.length > 20 && !line.includes('EDUCATION') && !line.includes('SKILLS')) {
        // Add to description
        currentExp.description = currentExp.description
          ? `${currentExp.description} ${line}`
          : line;
      }
    }

    // Don't forget the last experience
    if (currentExp && (currentExp.position || currentExp.company)) {
      experiences.push(this.createExperienceEntry(currentExp));
    }

    console.log('Extracted experiences:', experiences.length);
    return experiences;
  }

  private static extractEducation(text: string): Education[] {
    const education: Education[] = [];
    const lines = text.split('\n').map(line => line.trim());

    const educationKeywords = ['EDUCATION', 'ACADEMIC', 'QUALIFICATIONS'];
    let inEducationSection = false;
    let currentEdu: Partial<Education> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (educationKeywords.some(keyword => upperLine.includes(keyword))) {
        inEducationSection = true;
        continue;
      }

      if (inEducationSection && ['EXPERIENCE', 'SKILLS', 'PROJECTS', 'CERTIFICATIONS'].some(keyword => upperLine.includes(keyword))) {
        inEducationSection = false;
        if (currentEdu && currentEdu.institution) {
          education.push({
            id: Date.now().toString() + Math.random(),
            institution: currentEdu.institution || '',
            degree: currentEdu.degree || '',
            field: currentEdu.field || '',
            location: currentEdu.location || '',
            startDate: currentEdu.startDate || '',
            endDate: currentEdu.endDate || '',
            current: currentEdu.current || false,
            gpa: currentEdu.gpa || '',
            achievements: currentEdu.achievements || [],
          });
        }
        break;
      }

      if (!inEducationSection || !line) continue;

      // Look for degree patterns
      const degreeKeywords = ['Bachelor', 'Master', 'PhD', 'Doctorate', 'Associate', 'Certificate', 'Diploma'];
      if (degreeKeywords.some(keyword => line.includes(keyword))) {
        if (currentEdu && currentEdu.institution) {
          education.push({
            id: Date.now().toString() + Math.random(),
            institution: currentEdu.institution || '',
            degree: currentEdu.degree || '',
            field: currentEdu.field || '',
            location: currentEdu.location || '',
            startDate: currentEdu.startDate || '',
            endDate: currentEdu.endDate || '',
            current: currentEdu.current || false,
            gpa: currentEdu.gpa || '',
            achievements: currentEdu.achievements || [],
          });
        }

        currentEdu = {
          degree: line,
          achievements: [],
        };
      } else if (currentEdu && line.length > 5 && !line.includes('GPA') && !/\d{4}/.test(line)) {
        // Likely institution name
        currentEdu.institution = line;
      } else if (currentEdu && /GPA[\s:]*(\d+\.?\d*)/i.test(line)) {
        // Extract GPA
        const gpaMatch = line.match(/GPA[\s:]*(\d+\.?\d*)/i);
        if (gpaMatch) {
          currentEdu.gpa = gpaMatch[1];
        }
      }
    }

    if (currentEdu && currentEdu.institution) {
      education.push({
        id: Date.now().toString() + Math.random(),
        institution: currentEdu.institution || '',
        degree: currentEdu.degree || '',
        field: currentEdu.field || '',
        location: currentEdu.location || '',
        startDate: currentEdu.startDate || '',
        endDate: currentEdu.endDate || '',
        current: currentEdu.current || false,
        gpa: currentEdu.gpa || '',
        achievements: currentEdu.achievements || [],
      });
    }

    return education;
  }

  private static extractSkills(text: string): Skill[] {
    const skills: Skill[] = [];
    const lines = text.split('\n').map(line => line.trim());

    const skillsKeywords = ['SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'TECHNOLOGIES'];
    let inSkillsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (skillsKeywords.some(keyword => upperLine.includes(keyword))) {
        inSkillsSection = true;
        continue;
      }

      if (inSkillsSection && ['EXPERIENCE', 'EDUCATION', 'PROJECTS', 'CERTIFICATIONS'].some(keyword => upperLine.includes(keyword))) {
        inSkillsSection = false;
        break;
      }

      if (!inSkillsSection || !line) continue;

      // Split skills by common separators
      const skillsList = line.split(/[,•\-\|]/).map(s => s.trim()).filter(s => s.length > 1);

      skillsList.forEach(skillName => {
        if (skillName.length > 1 && skillName.length < 50) {
          skills.push({
            id: Date.now().toString() + Math.random(),
            name: skillName,
            category: this.categorizeSkill(skillName),
            level: 'intermediate',
          });
        }
      });
    }

    return skills;
  }

  private static categorizeSkill(skillName: string): Skill['category'] {
    const technical = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'aws', 'docker', 'kubernetes'];
    const languages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese'];

    const lowerSkill = skillName.toLowerCase();

    if (technical.some(tech => lowerSkill.includes(tech))) return 'technical';
    if (languages.some(lang => lowerSkill.includes(lang))) return 'language';
    if (['leadership', 'communication', 'teamwork', 'management'].some(soft => lowerSkill.includes(soft))) return 'soft';

    return 'other';
  }

  private static extractInterests(text: string): Interest[] {
    const interests: Interest[] = [];
    const lines = text.split('\n').map(line => line.trim());

    const interestKeywords = ['INTERESTS', 'HOBBIES', 'VOLUNTEER', 'ACTIVITIES', 'PERSONAL'];
    let inInterestSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (interestKeywords.some(keyword => upperLine.includes(keyword))) {
        inInterestSection = true;
        continue;
      }

      if (inInterestSection && ['EXPERIENCE', 'EDUCATION', 'SKILLS', 'REFERENCES'].some(keyword => upperLine.includes(keyword))) {
        inInterestSection = false;
        break;
      }

      if (!inInterestSection || !line) continue;

      const interestsList = line.split(/[,•\-\|]/).map(s => s.trim()).filter(s => s.length > 1);

      interestsList.forEach(interestName => {
        if (interestName.length > 1 && interestName.length < 100) {
          interests.push({
            id: Date.now().toString() + Math.random(),
            name: interestName,
            category: interestName.toLowerCase().includes('volunteer') ? 'volunteer' : 'hobby',
            description: '',
          });
        }
      });
    }

    return interests;
  }

  private static formatDate(dateStr: string): string {
    // Convert various date formats to YYYY-MM format
    const cleaned = dateStr.trim();

    // If already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(cleaned)) return cleaned;

    // If just year
    if (/^\d{4}$/.test(cleaned)) return `${cleaned}-01`;

    // If MM/YYYY format
    const mmYyyy = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyy) {
      const month = mmYyyy[1].padStart(2, '0');
      return `${mmYyyy[2]}-${month}`;
    }

    // If Month YYYY format
    const monthYear = cleaned.match(/^(\w+)\s+(\d{4})$/);
    if (monthYear) {
      const months: { [key: string]: string } = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'may': '05',
        'june': '06', 'jun': '06',
        'july': '07', 'jul': '07',
        'august': '08', 'aug': '08',
        'september': '09', 'sep': '09',
        'october': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'december': '12', 'dec': '12',
      };
      const monthNum = months[monthYear[1].toLowerCase()];
      if (monthNum) {
        return `${monthYear[2]}-${monthNum}`;
      }
    }

    return cleaned;
  }

  public static parseResumeText(text: string): Partial<UserProfile> {
    console.log('Starting resume parsing. Text length:', text.length);
    console.log('First 500 characters:', text.substring(0, 500));

    const result = {
      personalInfo: this.extractPersonalInfo(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      skills: this.extractSkills(text),
      interests: this.extractInterests(text),
    };

    console.log('Parsing complete. Result:', result);
    return result;
  }
}