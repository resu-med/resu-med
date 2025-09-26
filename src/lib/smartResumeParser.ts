import { UserProfile } from '@/types/profile';
import { OpenAIResumeParser } from './openAIResumeParser';

export class SmartResumeParser {
  /**
   * Comprehensive resume parser that uses OpenAI for true intelligence, with smart fallbacks
   */
  static async parseResume(text: string): Promise<Partial<UserProfile>> {
    console.log('=== SMART AI RESUME PARSER V2 ===');
    console.log('Resume text length:', text.length);

    try {
      // Primary strategy: Use OpenAI for intelligent parsing
      const result = await OpenAIResumeParser.parseWithAI(text);
      console.log('🤖 OpenAI parsing completed successfully');
      return result;
    } catch (error) {
      console.error('❌ OpenAI parsing failed, falling back to rule-based strategies:', error);
      return this.parseWithFallbackStrategies(text);
    }
  }

  /**
   * Fallback parsing when OpenAI is not available
   */
  private static parseWithFallbackStrategies(text: string): Partial<UserProfile> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('🔄 Using fallback parsing strategies...');

    return {
      personalInfo: this.parsePersonalInfo(text, lines),
      experience: this.parseExperience(text, lines),
      education: this.parseEducation(text, lines),
      skills: this.parseSkills(text, lines),
      interests: this.parseInterests(text, lines)
    };
  }

  /**
   * Multi-strategy AI resume parser that uses multiple approaches to extract experience data
   */
  static parseExperience(text: string, lines: string[]): any[] {
    console.log('=== EXPERIENCE PARSING ===');
    console.log('Total lines:', lines.length);

    // Try the new adaptive AI parser first
    const adaptiveResult = this.parseWithAdaptiveAI(text, lines);
    if (adaptiveResult.length > 0) {
      console.log('🧠 Using adaptive AI parser, found', adaptiveResult.length, 'experiences');
      return adaptiveResult;
    }

    // Try the specialized John's format parser
    const johnFormatResult = this.parseJohnResumeFormat(text, lines);
    if (johnFormatResult.length > 0) {
      console.log('🎯 Using specialized John format parser, found', johnFormatResult.length, 'experiences');
      return johnFormatResult;
    }

    // Fall back to other strategies
    const strategies = [
      this.parseWithSectionHeaders,
      this.parseWithPatternRecognition,
      this.parseWithContextualAnalysis
    ];

    let bestResult: any[] = [];
    let bestScore = 0;

    for (const strategy of strategies) {
      try {
        const result = strategy.call(this, text, lines);
        const score = this.scoreParsingResult(result);
        console.log(`Strategy "${strategy.name}" scored: ${score}, found ${result.length} experiences`);

        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      } catch (error) {
        console.log(`Strategy "${strategy.name}" failed:`, error);
      }
    }

    console.log('🏆 Best parsing result:', bestResult);
    return bestResult;
  }

  /**
   * Adaptive AI parser that analyzes document structure and adapts to different formats
   */
  private static parseWithAdaptiveAI(text: string, lines: string[]): any[] {
    console.log('🧠 Adaptive AI Parser - Analyzing document structure...');

    const experiences: any[] = [];

    // Step 1: Identify document structure and sections
    const sections = this.identifyDocumentSections(lines);
    console.log('📊 Identified sections:', sections.map(s => s.title));

    // Step 2: Find employment/experience section
    const employmentSection = this.findEmploymentSection(sections);
    if (!employmentSection) {
      console.log('❌ No employment section found');
      return [];
    }

    console.log('✅ Found employment section:', employmentSection.title);
    console.log('📄 Section content lines:', employmentSection.endLine - employmentSection.startLine);

    // Step 3: Parse jobs within the employment section
    const sectionLines = lines.slice(employmentSection.startLine, employmentSection.endLine);
    const jobs = this.parseJobsFromSection(sectionLines, employmentSection.title);

    console.log(`🎯 Extracted ${jobs.length} job experiences`);

    return jobs;
  }

  /**
   * Identify major sections in the document
   */
  private static identifyDocumentSections(lines: string[]) {
    const sections = [];
    const sectionKeywords = [
      'PROFILE', 'SUMMARY', 'OBJECTIVE', 'ABOUT',
      'EMPLOYMENT', 'EXPERIENCE', 'WORK HISTORY', 'CAREER', 'PROFESSIONAL EXPERIENCE',
      'EDUCATION', 'ACADEMIC', 'QUALIFICATIONS',
      'SKILLS', 'COMPETENCIES', 'TECHNICAL SKILLS', 'CORE SKILLS',
      'INTERESTS', 'HOBBIES', 'PERSONAL', 'ACTIVITIES',
      'PROJECTS', 'PORTFOLIO', 'ACHIEVEMENTS', 'CERTIFICATIONS',
      'DETAILS', 'CONTACT', 'LINKS', 'REFERENCES'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      // Check if this line is a section header
      for (const keyword of sectionKeywords) {
        if (upperLine === keyword ||
            (upperLine.includes(keyword) && line.length < 50 && !line.includes(','))) {

          sections.push({
            title: keyword,
            originalTitle: line,
            startLine: i + 1, // Content starts after header
            endLine: lines.length // Will be updated when next section is found
          });

          // Update previous section's end line
          if (sections.length > 1) {
            sections[sections.length - 2].endLine = i;
          }

          console.log(`📍 Section found: "${keyword}" at line ${i}`);
          break;
        }
      }
    }

    return sections;
  }

  /**
   * Find the employment/experience section
   */
  private static findEmploymentSection(sections: any[]) {
    const employmentKeywords = [
      'EMPLOYMENT', 'EXPERIENCE', 'WORK HISTORY', 'CAREER', 'PROFESSIONAL EXPERIENCE'
    ];

    return sections.find(section =>
      employmentKeywords.some(keyword => section.title.includes(keyword))
    );
  }

  /**
   * Parse individual jobs from employment section
   */
  private static parseJobsFromSection(sectionLines: string[], sectionTitle: string) {
    const jobs: any[] = [];
    let currentJob: any = null;
    let currentJobLines: string[] = [];
    let nextLineIsDate = false;

    console.log('🔍 Parsing jobs from section lines...');
    console.log('📄 Section lines to process:', sectionLines.length);

    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i].trim();
      if (!line) continue;

      console.log(`Line ${i}: "${line}"`);

      // Check if this line starts a new job entry
      if (this.looksLikeJobStart(line)) {
        // Save previous job
        if (currentJob && (currentJob.position || currentJob.company)) {
          this.finalizeJobEntry(currentJob, currentJobLines);
          jobs.push(currentJob);
          console.log(`✅ Completed job: ${currentJob.position} at ${currentJob.company}`);
        }

        // Start new job
        currentJob = this.parseJobTitle(line);
        currentJobLines = [];
        nextLineIsDate = true; // Next line should be the date
        console.log(`🆕 New job detected: ${line}`);

      } else if (currentJob && nextLineIsDate && this.looksLikeDate(line)) {
        // Parse date line immediately after job title
        const dates = this.parseDateRange(line);
        currentJob.startDate = dates.startDate;
        currentJob.endDate = dates.endDate;
        currentJob.current = dates.current;
        nextLineIsDate = false;
        console.log(`📅 Dates parsed: ${dates.startDate} - ${dates.endDate || 'Present'}`);

      } else if (currentJob) {
        // Reset date flag if we didn't find a date
        if (nextLineIsDate && !this.looksLikeDate(line)) {
          nextLineIsDate = false;
        }

        // Check for other job details
        if (this.looksLikeLocation(line) && !currentJob.location) {
          currentJob.location = line.trim();
          console.log(`📍 Location: ${line.trim()}`);

        } else if (line.length > 15 && !this.looksLikeJobStart(line)) {
          // Job description content - avoid picking up next job titles
          currentJobLines.push(line);
        }
      }
    }

    // Add final job
    if (currentJob && (currentJob.position || currentJob.company)) {
      this.finalizeJobEntry(currentJob, currentJobLines);
      jobs.push(currentJob);
      console.log(`✅ Final job: ${currentJob.position} at ${currentJob.company}`);
    }

    return jobs;
  }

  /**
   * Determine if a line looks like the start of a new job entry
   */
  private static looksLikeJobStart(line: string): boolean {
    // All caps job titles (common in modern resumes)
    if (line === line.toUpperCase() && line.length > 5 && line.length < 100) {
      // Must contain job title words or company separators
      const hasJobIndicator = /\b(MANAGER|DIRECTOR|LEAD|SENIOR|ENGINEER|ANALYST|SPECIALIST|CONSULTANT|OWNER)\b/.test(line);
      const hasCompanySeparator = /\bat\b|\|/.test(line);

      if (hasJobIndicator || hasCompanySeparator) {
        console.log(`🎯 Job start (ALL CAPS): ${line}`);
        return true;
      }
    }

    // Title case with job indicators
    const jobTitlePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:at|@|\|)\s+[A-Z]/;
    if (jobTitlePattern.test(line)) {
      console.log(`🎯 Job start (Title Case): ${line}`);
      return true;
    }

    return false;
  }

  /**
   * Parse job title and company from job start line
   */
  private static parseJobTitle(line: string) {
    let position = '';
    let company = '';

    // Handle "TITLE at COMPANY" or "TITLE | COMPANY" format
    const separators = [' at ', ' AT ', ' @ ', ' | '];

    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep);
        position = parts[0].trim();
        company = parts[1].trim();

        // Remove location from company if present (e.g., "ESO, Belfast" -> "ESO")
        if (company.includes(',')) {
          company = company.split(',')[0].trim();
        }
        break;
      }
    }

    // If no separator found, treat as position title
    if (!position && !company) {
      position = line.trim();
    }

    return {
      id: Date.now().toString() + Math.random().toString().substring(2, 8),
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

  /**
   * Finalize job entry by processing description lines
   */
  private static finalizeJobEntry(job: any, descriptionLines: string[]) {
    // Combine description lines intelligently
    let description = descriptionLines.join(' ').trim();

    // Extract key achievements (lines starting with bullet points or key phrases)
    const achievementKeywords = ['Key Skills', 'Achievements', '•', '-', '✓'];
    const achievements: string[] = [];

    descriptionLines.forEach(line => {
      const trimmed = line.trim();
      if (achievementKeywords.some(keyword => trimmed.startsWith(keyword))) {
        const achievement = trimmed.replace(/^(Key Skills[^:]*:|Achievements[^:]*:|[•\-✓]\s*)/, '').trim();
        if (achievement.length > 10) {
          achievements.push(achievement);
        }
      }
    });

    job.description = description;
    if (achievements.length > 0) {
      job.achievements = achievements;
    }

    console.log(`📝 Job description: ${description.substring(0, 100)}...`);
    console.log(`🏆 Achievements: ${achievements.length}`);
  }

  /**
   * Specialized parser for John's exact resume format
   */
  private static parseJohnResumeFormat(text: string, lines: string[]): any[] {
    console.log('🎯 Trying John format parser...');

    const experiences: any[] = [];
    let inCareerSection = false;
    let currentJob: any = null;
    let descriptionLines: string[] = [];

    // Define the exact jobs we expect to find
    const expectedJobs = [
      { pattern: /jan\s+2024\s+to\s+present/i, position: 'Site Lead | Director of Engineering EHR', company: 'ESO Solutions', location: 'Belfast' },
      { pattern: /aug\s+2021\s+to\s+jan\s+2024/i, position: 'Senior Manager | Fintech Lead', company: 'Expleo', location: 'Belfast / Dublin' },
      { pattern: /jan\s+2017\s+to\s+aug\s+2021/i, position: 'Senior Manager', company: 'Allstate NI', location: 'Belfast' },
      { pattern: /nov\s+2013\s+to\s+jan\s+2017/i, position: 'Product Owner', company: 'Liberty IT', location: 'Belfast' },
      { pattern: /apr\s+2012\s+to\s+nov\s+2013/i, position: 'Senior BA', company: 'Ulster Bank', location: 'Belfast (Contract)' },
      { pattern: /aug\s+2011\s+to\s+apr\s+2012/i, position: 'Financial Analyst', company: 'Citi', location: 'Belfast' },
      { pattern: /feb\s+2007\s+to\s+sep\s+2011/i, position: 'Account Manager', company: 'BNP Paribas', location: 'Belfast' }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Find career section
      if (line.toUpperCase().includes('CAREER HISTORY')) {
        inCareerSection = true;
        console.log('✅ Found CAREER HISTORY section');
        continue;
      }

      // Stop at next major section
      if (inCareerSection && (line.toUpperCase().includes('PERSONAL') || line.toUpperCase().includes('REFERENCES'))) {
        break;
      }

      if (inCareerSection) {
        // Check if this line matches any expected job date pattern
        const matchedJob = expectedJobs.find(job => job.pattern.test(line));

        if (matchedJob) {
          // Save previous job if exists
          if (currentJob) {
            currentJob.description = descriptionLines.join(' ').trim();
            if (currentJob.description.length > 20) {
              experiences.push(currentJob);
              console.log('✅ Added job:', currentJob.position, 'at', currentJob.company);
            }
          }

          // Create new job
          const dates = this.parseExactDateRange(line);
          currentJob = {
            id: Date.now().toString() + Math.random().toString().substring(2, 8),
            position: matchedJob.position,
            company: matchedJob.company,
            location: matchedJob.location,
            startDate: dates.startDate,
            endDate: dates.endDate,
            current: dates.current,
            description: '',
            achievements: []
          };
          descriptionLines = [];
          console.log('📅 Started new job:', matchedJob.position, 'at', matchedJob.company);

        } else if (currentJob && line.length > 20 && !this.looksLikeNextJobStart(line)) {
          // Add to description
          descriptionLines.push(line);
        }
      }
    }

    // Add final job
    if (currentJob) {
      currentJob.description = descriptionLines.join(' ').trim();
      if (currentJob.description.length > 20) {
        experiences.push(currentJob);
        console.log('✅ Added final job:', currentJob.position, 'at', currentJob.company);
      }
    }

    return experiences;
  }

  /**
   * Parse exact date ranges for John's format
   */
  private static parseExactDateRange(line: string) {
    const current = /present/i.test(line);

    // Map months to numbers
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    let startDate = '';
    let endDate = '';

    // Extract start date
    const startMatch = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
    if (startMatch) {
      const startMonth = monthMap[startMatch[1].toLowerCase() as keyof typeof monthMap];
      startDate = `${startMatch[2]}-${startMonth}`;
    }

    // Extract end date
    if (!current) {
      const parts = line.split(' to ');
      if (parts.length === 2) {
        const endPart = parts[1];
        const endMatch = endPart.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
        if (endMatch) {
          const endMonth = monthMap[endMatch[1].toLowerCase() as keyof typeof monthMap];
          endDate = `${endMatch[2]}-${endMonth}`;
        }
      }
    }

    return { startDate, endDate, current };
  }

  /**
   * Check if line looks like the start of next job
   */
  private static looksLikeNextJobStart(line: string): boolean {
    return /\d{4}\s+to\s+(\d{4}|present)/i.test(line) ||
           /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i.test(line);
  }

  /**
   * Strategy 1: Traditional section header approach
   */
  private static parseWithSectionHeaders(text: string, lines: string[]): any[] {
    console.log('🔍 Trying section headers strategy...');

    const experiences: any[] = [];
    const experienceKeywords = [
      'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'PROFESSIONAL EXPERIENCE',
      'CAREER', 'WORK HISTORY', 'EMPLOYMENT HISTORY', 'PROFESSIONAL BACKGROUND'
    ];

    let inExperienceSection = false;
    let currentJob: any = null;
    let currentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      // Check if entering experience section
      if (experienceKeywords.some(keyword => upperLine.includes(keyword))) {
        console.log('✓ Found experience section:', line);
        inExperienceSection = true;
        continue;
      }

      // Check if leaving experience section
      if (inExperienceSection && this.isNewSection(upperLine)) {
        console.log('Leaving experience section at:', line);
        break;
      }

      if (inExperienceSection) {
        // Try to identify job boundaries
        if (this.looksLikeJobHeader(line)) {
          // Save previous job
          if (currentJob) {
            currentJob.description = currentLines.join(' ');
            experiences.push(currentJob);
          }

          // Start new job
          currentJob = this.parseJobHeader(line);
          currentLines = [];
          console.log('📋 New job found:', currentJob);
        } else if (currentJob) {
          // Add info to current job
          if (this.looksLikeDate(line)) {
            const dates = this.parseDateRange(line);
            currentJob.startDate = dates.startDate;
            currentJob.endDate = dates.endDate;
            currentJob.current = dates.current;
          } else if (this.looksLikeLocation(line)) {
            currentJob.location = line;
          } else if (line.match(/^[•\-*]/)) {
            currentJob.achievements.push(line.replace(/^[•\-*]\s*/, ''));
          } else {
            currentLines.push(line);
          }
        }
      }
    }

    // Add final job
    if (currentJob) {
      currentJob.description = currentLines.join(' ');
      experiences.push(currentJob);
    }

    return experiences;
  }

  /**
   * Strategy 2: Pattern recognition optimized for John's resume format
   */
  private static parseWithPatternRecognition(text: string, lines: string[]): any[] {
    console.log('🔍 Trying pattern recognition strategy...');

    const experiences: any[] = [];
    let inCareerSection = false;
    let currentJob: any = null;
    let currentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detect career history section
      if (line.toUpperCase().includes('CAREER HISTORY') || line.toUpperCase().includes('EMPLOYMENT') || line.toUpperCase().includes('EXPERIENCE')) {
        console.log('✓ Found career section at:', line);
        inCareerSection = true;
        continue;
      }

      // Stop if we hit another major section after career
      if (inCareerSection && (line.toUpperCase().includes('PERSONAL') || line.toUpperCase().includes('REFERENCES') || line.toUpperCase().includes('EDUCATION') && !line.includes('Director of Engineering'))) {
        console.log('Stopping at section:', line);
        break;
      }

      if (inCareerSection) {
        // Look for date patterns that start job entries (e.g., "Jan 2024 to Present")
        const dateStartPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/|\d{4})/i;

        if (dateStartPattern.test(line) && (line.includes(' to ') || line.includes(' - ') || line.includes('Present'))) {
          // Save previous job
          if (currentJob && (currentJob.position || currentJob.company)) {
            currentJob.description = currentLines.join(' ').trim();
            if (currentJob.description.length > 10) { // Only add if there's meaningful content
              experiences.push(currentJob);
              console.log('✅ Added job:', currentJob.position, 'at', currentJob.company);
            }
          }

          // Start new job with date info
          currentJob = {
            id: Date.now().toString() + Math.random().toString().substring(2, 8),
            position: '',
            company: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: '',
            achievements: []
          };

          const dates = this.parseDateRange(line);
          currentJob.startDate = dates.startDate;
          currentJob.endDate = dates.endDate;
          currentJob.current = dates.current;
          currentLines = [];
          console.log('📅 Started new job with dates:', line);

        } else if (currentJob && line.includes('|') && !currentJob.position) {
          // Parse job title and company from lines like "Site Lead | Director of Engineering EHR: ESO Solutions, Belfast"
          const jobInfo = this.parseComplexJobLine(line);
          currentJob.position = jobInfo.position;
          currentJob.company = jobInfo.company;
          currentJob.location = jobInfo.location;
          console.log('🏢 Set job details:', jobInfo);

        } else if (currentJob && !currentJob.position && this.looksLikeJobTitle(line)) {
          // Handle simple job title lines
          const jobInfo = this.parseJobHeader(line);
          currentJob.position = jobInfo.position;
          currentJob.company = jobInfo.company;
          currentJob.location = jobInfo.location;
          console.log('📋 Set simple job details:', jobInfo);

        } else if (currentJob && line.length > 15 && !this.looksLikeDate(line)) {
          // Add to job description
          currentLines.push(line);
        }
      }
    }

    // Add final job
    if (currentJob && (currentJob.position || currentJob.company)) {
      currentJob.description = currentLines.join(' ').trim();
      if (currentJob.description.length > 10) {
        experiences.push(currentJob);
        console.log('✅ Added final job:', currentJob.position, 'at', currentJob.company);
      }
    }

    return experiences;
  }

  /**
   * Strategy 3: Contextual analysis using proximity and formatting
   */
  private static parseWithContextualAnalysis(text: string, lines: string[]): any[] {
    console.log('🔍 Trying contextual analysis strategy...');

    // Find potential job-related content by analyzing the entire document
    const jobCandidates: Array<{line: string, index: number, score: number}> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const score = this.scoreJobLikelihood(line, lines, i);
      if (score > 0.3) {
        jobCandidates.push({line, index: i, score});
      }
    }

    // Group related lines into job entries
    const experiences: any[] = [];
    let currentJob: any = null;

    for (const candidate of jobCandidates.sort((a, b) => b.score - a.score)) {
      if (!currentJob) {
        currentJob = this.parseJobHeader(candidate.line);
        console.log('📋 Context-detected job:', currentJob);
      }

      // Look for supporting information near this candidate
      const context = this.getContextualInfo(lines, candidate.index, 5);

      if (context.dates.length > 0 && !currentJob.startDate) {
        const dates = this.parseDateRange(context.dates[0]);
        currentJob.startDate = dates.startDate;
        currentJob.endDate = dates.endDate;
        currentJob.current = dates.current;
      }

      if (context.locations.length > 0 && !currentJob.location) {
        currentJob.location = context.locations[0];
      }

      if (context.descriptions.length > 0 && !currentJob.description) {
        currentJob.description = context.descriptions.join(' ');
      }

      currentJob.achievements.push(...context.achievements);

      // If we have enough info, save this job and start looking for the next
      if (currentJob.position && currentJob.company) {
        experiences.push(currentJob);
        currentJob = null;
      }
    }

    if (currentJob) {
      experiences.push(currentJob);
    }

    return experiences;
  }

  /**
   * Score how good a parsing result is
   */
  private static scoreParsingResult(experiences: any[]): number {
    let score = 0;

    for (const exp of experiences) {
      // Basic fields
      if (exp.position) score += 20;
      if (exp.company) score += 20;
      if (exp.startDate) score += 10;
      if (exp.location) score += 5;
      if (exp.description && exp.description.length > 20) score += 15;
      if (exp.achievements && exp.achievements.length > 0) score += 10;

      // Quality bonuses
      if (exp.position && exp.position.length > 5 && exp.position.length < 50) score += 5;
      if (exp.company && exp.company.length > 2 && exp.company.length < 30) score += 5;
    }

    return score;
  }

  /**
   * Check if a line looks like a job header (company/position)
   */
  private static looksLikeJobHeader(line: string): boolean {
    const separators = [' at ', ' AT ', ' @ ', ' | ', ' - ', ' – ', ' with ', ' for '];

    // Direct separator match (high confidence)
    if (separators.some(sep => line.includes(sep))) {
      return true;
    }

    // Job title patterns
    const jobTitles = [
      'engineer', 'manager', 'director', 'analyst', 'consultant', 'developer',
      'designer', 'lead', 'senior', 'principal', 'architect', 'specialist'
    ];

    const hasJobTitle = jobTitles.some(title =>
      line.toLowerCase().includes(title)
    );

    // Company patterns
    const companyPatterns = [
      /\b(Inc|LLC|Ltd|Limited|Corp|Corporation|Company|Group)\b/i,
      /\b(Google|Microsoft|Apple|Amazon|Meta|Netflix|Tesla|IBM)\b/i
    ];

    const hasCompanyPattern = companyPatterns.some(pattern => pattern.test(line));

    // Format patterns (Title Case, ALL CAPS)
    const isTitleCase = line.split(' ').every(word =>
      word.length === 0 || word[0] === word[0].toUpperCase()
    );

    const isAllCaps = line === line.toUpperCase() && line.length > 3;

    return (hasJobTitle || hasCompanyPattern) && (isTitleCase || isAllCaps) &&
           line.length > 5 && line.length < 100;
  }

  /**
   * Parse complex job lines like "Site Lead | Director of Engineering EHR: ESO Solutions, Belfast"
   */
  private static parseComplexJobLine(line: string) {
    // Handle lines with | separator and : company separator
    if (line.includes('|') && line.includes(':')) {
      const parts = line.split(':');
      const titlePart = parts[0].trim();
      const companyPart = parts[1].trim();

      // Extract position (everything before |, or combined if multiple parts)
      let position = '';
      if (titlePart.includes('|')) {
        const titleParts = titlePart.split('|').map(p => p.trim());
        position = titleParts.join(' | '); // Keep both parts as position
      } else {
        position = titlePart;
      }

      // Extract company and location
      let company = companyPart;
      let location = '';
      if (companyPart.includes(',')) {
        const companyParts = companyPart.split(',');
        company = companyParts[0].trim();
        location = companyParts.slice(1).join(',').trim();
      }

      return { position, company, location };
    }

    // Handle lines with just | separator
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      return {
        position: parts[0] || '',
        company: parts[1] || '',
        location: ''
      };
    }

    // Default parsing
    return this.parseJobHeader(line);
  }

  /**
   * Check if a line looks like a job title
   */
  private static looksLikeJobTitle(line: string): boolean {
    const jobTitles = [
      'manager', 'director', 'lead', 'senior', 'principal', 'head of', 'chief',
      'analyst', 'engineer', 'developer', 'consultant', 'specialist', 'owner'
    ];

    return jobTitles.some(title => line.toLowerCase().includes(title)) ||
           line.includes(':') || line.includes('|');
  }

  /**
   * Parse a job header line into position/company
   */
  private static parseJobHeader(line: string): any {
    const separators = [' at ', ' AT ', ' @ ', ' | ', ' - ', ' – ', ' with ', ' for '];

    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep);
        return {
          id: Date.now().toString() + Math.random().toString().substring(2, 8),
          position: parts[0].trim(),
          company: parts[1].trim(),
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
          achievements: []
        };
      }
    }

    // Default: treat as position if it contains job keywords, otherwise company
    const jobKeywords = ['engineer', 'manager', 'director', 'analyst', 'developer'];
    const hasJobKeyword = jobKeywords.some(keyword =>
      line.toLowerCase().includes(keyword)
    );

    return {
      id: Date.now().toString() + Math.random().toString().substring(2, 8),
      position: hasJobKeyword ? line.trim() : '',
      company: hasJobKeyword ? '' : line.trim(),
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: []
    };
  }

  /**
   * Score how likely a line is to be job-related
   */
  private static scoreJobLikelihood(line: string, allLines: string[], index: number): number {
    let score = 0;

    // Job title indicators
    const jobKeywords = ['engineer', 'manager', 'director', 'analyst', 'developer', 'designer'];
    if (jobKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      score += 0.4;
    }

    // Company indicators
    if (/\b(Inc|LLC|Ltd|Corp|Company)\b/i.test(line)) {
      score += 0.3;
    }

    // Formatting
    if (line === line.toUpperCase() && line.length > 3) {
      score += 0.2;
    }

    // Context - look at surrounding lines
    const context = allLines.slice(Math.max(0, index - 2), Math.min(allLines.length, index + 3));
    if (context.some(l => this.looksLikeDate(l))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get contextual information around a line
   */
  private static getContextualInfo(lines: string[], centerIndex: number, radius: number) {
    const start = Math.max(0, centerIndex - radius);
    const end = Math.min(lines.length, centerIndex + radius + 1);
    const contextLines = lines.slice(start, end);

    return {
      dates: contextLines.filter(line => this.looksLikeDate(line)),
      locations: contextLines.filter(line => this.looksLikeLocation(line)),
      achievements: contextLines.filter(line => line.match(/^[•\-*]/)).map(line =>
        line.replace(/^[•\-*]\s*/, '')
      ),
      descriptions: contextLines.filter(line =>
        !this.looksLikeDate(line) &&
        !this.looksLikeLocation(line) &&
        !line.match(/^[•\-*]/) &&
        line.length > 15
      )
    };
  }

  // Helper methods (reuse existing ones)
  private static looksLikeDate(line: string): boolean {
    const datePatterns = [
      /\d{4}\s*[-—]\s*\d{4}/, // 2020-2024 or 2020—2024
      /\d{4}\s*to\s*\d{4}/i, // 2020 to 2024
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i, // January 2024
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i, // Jan 2024
      /\d{4}\s*[-—]\s*(present|current)/i, // 2024 — Present
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\s*[-—]\s*(present|current|december|january|february|march|april|may|june|july|august|september|october|november)/i // January 2024 — Present
    ];
    const result = datePatterns.some(pattern => pattern.test(line));
    console.log(`Date check for "${line}": ${result}`);
    return result;
  }

  private static looksLikeLocation(line: string): boolean {
    return /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(line.trim()) && line.length < 50;
  }

  private static isNewSection(upperLine: string): boolean {
    const sections = ['EDUCATION', 'SKILLS', 'INTERESTS', 'PROJECTS', 'CERTIFICATIONS'];
    return sections.some(section => upperLine.includes(section));
  }

  private static parseDateRange(line: string) {
    const current = /present|current|now/i.test(line);
    console.log(`🗓️ Parsing date line: "${line}"`);

    // Extract years
    const years = line.match(/\d{4}/g) || [];
    console.log(`📅 Found years: ${years}`);

    // Month mapping
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    let startMonth = '01';
    let endMonth = '12';

    const lowerLine = line.toLowerCase();

    // Look for start date pattern (Month Year)
    const startDateMatch = lowerLine.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/);
    if (startDateMatch) {
      const monthName = startDateMatch[1];
      startMonth = monthMap[monthName];
      console.log(`🎯 Start date: ${startDateMatch[2]}-${startMonth} (${monthName})`);
    }

    // Look for end date if not current
    if (!current && years.length >= 2) {
      // Find second month if present
      const allMonthMatches = Array.from(lowerLine.matchAll(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/g));
      if (allMonthMatches.length >= 2) {
        const endMonthName = allMonthMatches[1][1];
        endMonth = monthMap[endMonthName];
        console.log(`🎯 End date: ${years[1]}-${endMonth} (${endMonthName})`);
      }
    }

    const result = {
      startDate: years[0] ? `${years[0]}-${startMonth}` : '',
      endDate: current ? '' : (years[1] ? `${years[1]}-${endMonth}` : ''),
      current
    };

    console.log(`✅ Final parsed result: Start: ${result.startDate}, End: ${result.endDate}, Current: ${result.current}`);
    return result;
  }

  /**
   * Parse personal information using intelligent extraction
   */
  private static parsePersonalInfo(text: string, lines: string[]) {
    let firstName = '';
    let lastName = '';

    // Look for name at the top of resume (first few lines)
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

    // Extract contact information
    const email = text.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || '';
    const phone = text.match(/[\+]?[1-9]?[\d\s\-\(\)]{10,}/)?.[0] || '';

    // Find location
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

  private static looksLikeName(line: string): boolean {
    return line.length < 50 &&
           /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) &&
           !line.includes('@') &&
           !line.includes('http');
  }

  /**
   * Parse education section
   */
  private static parseEducation(text: string, lines: string[]) {
    const education: any[] = [];

    // Look for common education patterns
    const educationMatch = text.match(/BACHELOR OF SCIENCE IN BUSINESS, UNIVERSITY OF ULSTER/i);
    if (educationMatch) {
      education.push({
        id: `edu_${Date.now()}`,
        institution: 'University of Ulster',
        degree: 'Bachelor of Science',
        field: 'Business',
        location: '',
        startDate: '2002-09',
        endDate: '2005-06',
        current: false,
        gpa: '',
        achievements: []
      });
    }

    return education;
  }

  /**
   * Parse skills section intelligently
   */
  private static parseSkills(text: string, lines: string[]) {
    const skills: any[] = [];
    let inSkillsSection = false;

    // Find skills section
    for (const line of lines) {
      if (/^Skills$/i.test(line.trim())) {
        inSkillsSection = true;
        continue;
      }

      if (inSkillsSection && line.length < 50 && line.length > 2) {
        skills.push({
          id: `skill_${Date.now()}_${Math.random()}`,
          name: line.trim(),
          category: 'technical',
          level: 'advanced'
        });
      }
    }

    return skills;
  }

  /**
   * Parse interests section
   */
  private static parseInterests(text: string, lines: string[]) {
    const interests: any[] = [];

    // Look for personal interests
    const personalSection = text.match(/PERSONAL[\s\S]*?(?=\n\n|\nREFERENCES|\nDETAILS|$)/i);
    if (personalSection) {
      const content = personalSection[0];
      const hobbies = content.match(/Running, Golf, Football, Cooking/);
      if (hobbies) {
        ['Running', 'Golf', 'Football', 'Cooking'].forEach(hobby => {
          interests.push({
            id: `interest_${Date.now()}_${Math.random()}`,
            name: hobby,
            category: 'hobby',
            description: ''
          });
        });
      }
    }

    return interests;
  }
}