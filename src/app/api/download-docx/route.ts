import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { content, type, filename, profile } = await request.json();

    console.log('📋 DOCX Request:', {
      contentLength: content?.length,
      type,
      filename,
      contentPreview: content?.substring(0, 200) + '...'
    });

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    let doc: Document;

    if (type === 'resume') {
      doc = await createResumeDocument(content, profile);
    } else if (type === 'cover-letter') {
      doc = createCoverLetterDocument(content, profile);
    } else {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    console.log('✅ Generated DOCX buffer, size:', buffer.length);

    // Return the document as a downloadable file
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename || 'document.docx'}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating DOCX:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}

async function createResumeDocument(content: string, profile?: any): Promise<Document> {
  console.log('📄 Creating AI-powered resume document, content length:', content.length);

  const children: Paragraph[] = [];

  // Add personal information header from profile if available
  if (profile?.personalInfo) {
    children.push(...createPersonalInfoSection(profile.personalInfo));
  }

  // Use AI to intelligently parse the resume content
  const parsedSections = await parseResumeWithAI(content);

  // Add each parsed section to the document
  children.push(...createDocumentSections(parsedSections));

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 inch
            bottom: 720,
            left: 720,
            right: 720
          }
        }
      },
      children
    }]
  });
}

function createPersonalInfoSection(personalInfo: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add full name as header
  if (personalInfo.firstName || personalInfo.lastName) {
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: fullName,
            bold: true,
            size: 32,
            color: "1F4E79",
            font: "Calibri"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 }
      })
    );
  }

  // Add contact information on separate lines for better formatting
  if (personalInfo.location) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: personalInfo.location,
            size: 20,
            color: "666666",
            font: "Calibri"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    );
  }

  // Email and phone on one line with separator
  const contactLine = [];
  if (personalInfo.email) contactLine.push(personalInfo.email);
  if (personalInfo.phone) contactLine.push(personalInfo.phone);

  if (contactLine.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactLine.join(' | '),
            size: 20,
            color: "666666",
            font: "Calibri"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    );
  }

  // Add LinkedIn and website links if available
  const socialLinks = [];
  if (personalInfo.linkedin) socialLinks.push(`LinkedIn: ${personalInfo.linkedin}`);
  if (personalInfo.website) socialLinks.push(`Portfolio: ${personalInfo.website}`);

  if (socialLinks.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: socialLinks.join(' | '),
            size: 18,
            color: "666666",
            font: "Calibri"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    );
  } else {
    // Add extra spacing if no social links
    if (contactLine.length > 0) {
      const lastParagraph = paragraphs[paragraphs.length - 1];
      if (lastParagraph) {
        lastParagraph.spacing = { after: 300 };
      }
    }
  }

  return paragraphs;
}

async function parseResumeWithAI(content: string): Promise<any> {
  try {
    // If OpenAI is available, use it for intelligent parsing
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      });

      const prompt = `
        Parse this resume content and extract the structured information for professional formatting. Return a JSON object with these EXACT sections:

        {
          "sections": [
            {
              "type": "summary",
              "title": "PROFESSIONAL SUMMARY",
              "content": [
                {
                  "type": "text",
                  "content": "Professional summary paragraph text"
                }
              ]
            },
            {
              "type": "skills",
              "title": "CORE COMPETENCIES",
              "content": [
                {
                  "type": "skill-group",
                  "category": "Primary Skills",
                  "skills": ["Skill 1", "Skill 2", "Skill 3"]
                },
                {
                  "type": "skill-group",
                  "category": "Additional Skills",
                  "skills": ["Skill 4", "Skill 5"]
                }
              ]
            },
            {
              "type": "experience",
              "title": "PROFESSIONAL EXPERIENCE",
              "content": [
                {
                  "type": "job",
                  "jobTitle": "Senior Software Engineer",
                  "company": "Google Inc.",
                  "location": "Mountain View, CA",
                  "dates": "January 2020 - Present",
                  "description": "Job description text",
                  "achievements": ["Achievement 1", "Achievement 2"]
                }
              ]
            },
            {
              "type": "education",
              "title": "EDUCATION",
              "content": [
                {
                  "type": "education",
                  "degree": "Bachelor of Science",
                  "field": "Computer Science",
                  "institution": "University Name",
                  "location": "City, State",
                  "dates": "2016 - 2020",
                  "gpa": "3.8",
                  "achievements": ["Achievement 1"]
                }
              ]
            }
          ]
        }

        Resume content:
        ${content}

        IMPORTANT:
        - Extract ALL job titles, company names, dates, and achievements exactly as written
        - Group skills into Primary Skills and Additional Skills categories
        - Ensure proper section organization for professional formatting
        - Preserve exact employment dates and company names
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert resume parser specializing in professional document structure. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2500
      });

      const aiResponse = response.choices[0].message.content || '{}';
      console.log('🤖 Raw AI response:', aiResponse);

      try {
        const parsed = JSON.parse(aiResponse);
        console.log('🤖 AI parsed resume structure:', JSON.stringify(parsed, null, 2));

        // Validate the parsed structure
        if (parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          return parsed;
        } else {
          console.log('⚠️ AI response missing proper sections, using fallback');
          throw new Error('Invalid AI response structure');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError);
        throw parseError;
      }
    }
  } catch (error) {
    console.error('❌ AI parsing failed:', error);
  }

  // Fallback to simple text parsing
  return parseResumeContentFallback(content);
}

function createDocumentSections(parsedData: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!parsedData.sections) {
    return createFallbackDocument(parsedData);
  }

  for (const section of parsedData.sections) {
    // Create professional section headers with consistent styling
    if (section.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 28,
              color: "1F4E79",
            font: "Calibri",
              allCaps: true
            })
          ],
          spacing: { before: 600, after: 300 },
          border: {
            bottom: {
              color: "1F4E79",
            font: "Calibri",
              space: 5,
              style: BorderStyle.SINGLE,
              size: 10
            }
          }
        })
      );
    }

    // Handle different section types with appropriate formatting
    if (section.content) {
      if (section.type === 'summary') {
        // Professional Summary formatting
        for (const item of section.content) {
          if (item.type === 'text') {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.content,
                    size: 24
                  })
                ],
                spacing: { after: 300 },
                alignment: AlignmentType.JUSTIFIED
              })
            );
          }
        }
      } else if (section.type === 'skills') {
        // Core Competencies formatting
        for (const item of section.content) {
          if (item.type === 'skill-group') {
            // Skill category header
            if (item.category) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.category + ':',
                      bold: true,
                      size: 22,
                      color: "2D4A6B",
            font: "Calibri"
                    })
                  ],
                  spacing: { before: 200, after: 100 }
                })
              );
            }

            // Skills list
            if (item.skills && item.skills.length > 0) {
              const skillsText = item.skills.join(' • ');
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: skillsText,
                      size: 22,
                      font: "Calibri"
                    })
                  ],
                  spacing: { after: 150 },
                  indent: { left: 360 }
                })
              );
            }
          }
        }
      } else if (section.type === 'experience') {
        // Professional Experience formatting
        for (const item of section.content) {
          if (item.type === 'job') {
            // Job title (prominent)
            if (item.jobTitle) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.jobTitle,
                      bold: true,
                      size: 26,
                      color: "1F4E79",
            font: "Calibri"
                    })
                  ],
                  spacing: { before: 400, after: 100 }
                })
              );
            }

            // Company and location
            if (item.company || item.location) {
              const companyInfo = [item.company, item.location].filter(Boolean).join(' | ');
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: companyInfo,
                      bold: true,
                      size: 22,
                      color: "2D4A6B",
            font: "Calibri"
                    })
                  ],
                  spacing: { after: 100 }
                })
              );
            }

            // Employment dates
            if (item.dates) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatDateRange(item.dates),
                      italics: true,
                      size: 20,
                      color: "666666",
            font: "Calibri"
                    })
                  ],
                  spacing: { after: 200 }
                })
              );
            }

            // Job description
            if (item.description) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.description,
                      size: 22,
                      font: "Calibri"
                    })
                  ],
                  spacing: { after: 150 },
                  alignment: AlignmentType.JUSTIFIED
                })
              );
            }

            // Key Achievements header and bullets
            if (item.achievements && item.achievements.length > 0) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Key Achievements:',
                      bold: true,
                      size: 22,
                      color: "2D4A6B",
            font: "Calibri"
                    })
                  ],
                  spacing: { before: 200, after: 100 }
                })
              );

              for (const achievement of item.achievements) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: achievement.startsWith('•') ? achievement : `• ${achievement}`,
                        size: 22,
                        font: "Calibri"
                      })
                    ],
                    spacing: { after: 120 },
                    indent: { left: 360 }
                  })
                );
              }
            }
          }
        }
      } else if (section.type === 'education') {
        // Education formatting
        for (const item of section.content) {
          if (item.type === 'education') {
            // Degree and field
            if (item.degree && item.field) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${item.degree} in ${item.field}`,
                      bold: true,
                      size: 24,
                      color: "1F4E79",
            font: "Calibri"
                    })
                  ],
                  spacing: { before: 300, after: 100 }
                })
              );
            }

            // Institution and location
            if (item.institution || item.location) {
              const institutionInfo = [item.institution, item.location].filter(Boolean).join(' | ');
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: institutionInfo,
                      bold: true,
                      size: 22,
                      color: "2D4A6B",
            font: "Calibri"
                    })
                  ],
                  spacing: { after: 100 }
                })
              );
            }

            // Education dates
            if (item.dates) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatDateRange(item.dates),
                      italics: true,
                      size: 20,
                      color: "666666",
            font: "Calibri"
                    })
                  ],
                  spacing: { after: 100 }
                })
              );
            }

            // GPA if available
            if (item.gpa) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `GPA: ${item.gpa}`,
                      size: 22,
                      font: "Calibri"
                    })
                  ],
                  spacing: { after: 200 }
                })
              );
            }

            // Education achievements
            if (item.achievements && item.achievements.length > 0) {
              for (const achievement of item.achievements) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: achievement.startsWith('•') ? achievement : `• ${achievement}`,
                        size: 22,
                        font: "Calibri"
                      })
                    ],
                    spacing: { after: 120 },
                    indent: { left: 360 }
                  })
                );
              }
            }
          }
        }
      }
    }
  }

  // Add References section at the end
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'REFERENCES',
          bold: true,
          size: 28,
          color: "1F4E79",
            font: "Calibri",
          allCaps: true
        })
      ],
      spacing: { before: 600, after: 300 },
      border: {
        bottom: {
          color: "1F4E79",
            font: "Calibri",
          space: 5,
          style: BorderStyle.SINGLE,
          size: 10
        }
      }
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Available upon request',
          size: 24
        })
      ],
      spacing: { after: 300 },
      alignment: AlignmentType.CENTER
    })
  );

  return paragraphs;
}

function createFallbackDocument(content: any): Paragraph[] {
  // Simple fallback if AI parsing fails
  const lines = (typeof content === 'string' ? content : JSON.stringify(content))
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line,
          size: 22,
          font: "Calibri"
        })
      ],
      spacing: { after: 150 }
    })
  );
}

function parseResumeContentFallback(content: string): any {
  console.log('🔄 Using fallback parsing for resume content');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const sections = [];
  let currentSection = null;
  let currentContent = [];

  // Define section patterns
  const sectionPatterns = {
    summary: /^(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|OVERVIEW)$/i,
    skills: /^(CORE COMPETENCIES|SKILLS|COMPETENCIES|TECHNICAL SKILLS)$/i,
    experience: /^(PROFESSIONAL EXPERIENCE|EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT)$/i,
    education: /^(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)$/i
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a section header
    let foundSection = null;
    for (const [sectionType, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line)) {
        foundSection = { type: sectionType, title: line };
        break;
      }
    }

    if (foundSection) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        currentSection.content = parseContentForSection(currentContent, currentSection.type);
        sections.push(currentSection);
      }

      // Start new section
      currentSection = foundSection;
      currentContent = [];
    } else if (currentSection) {
      // Add content to current section
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentSection && currentContent.length > 0) {
    currentSection.content = parseContentForSection(currentContent, currentSection.type);
    sections.push(currentSection);
  }

  return { sections };
}

function parseContentForSection(lines: string[], sectionType: string): any[] {
  if (sectionType === 'experience') {
    return parseExperienceSection(lines);
  } else if (sectionType === 'skills') {
    return parseSkillsSection(lines);
  } else if (sectionType === 'education') {
    return parseEducationSection(lines);
  } else {
    return lines.map(line => ({ type: "text", content: line }));
  }
}

function parseExperienceSection(lines: string[]): any[] {
  console.log('🔍 Parsing experience section with lines:', lines);
  const jobs = [];
  let currentJob = null;
  let currentAchievements = [];
  let expectingCompanyNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

    console.log(`📝 Processing line ${i}: "${line}"`);

    // Enhanced job title detection
    const isJobTitle = (
      // Exclude obvious non-title patterns
      !line.includes('•') &&
      !line.includes('-') &&
      !/^\d{4}/.test(line) &&
      !line.includes('Present') &&
      !line.toLowerCase().includes('key achievements') &&
      !line.toLowerCase().includes('achievements:') &&
      line.length > 3 &&
      line.length < 150 &&
      // Check if this looks like a job title
      (
        // Next line contains company info (company | location pattern)
        (nextLine && nextLine.includes('|') && !nextLine.toLowerCase().includes('director') && !nextLine.toLowerCase().includes('manager') && !nextLine.toLowerCase().includes('lead')) ||
        // Or this line contains job title keywords
        line.toLowerCase().includes('manager') ||
        line.toLowerCase().includes('director') ||
        line.toLowerCase().includes('lead') ||
        line.toLowerCase().includes('engineer') ||
        line.toLowerCase().includes('analyst') ||
        line.toLowerCase().includes('coordinator') ||
        line.toLowerCase().includes('specialist') ||
        line.toLowerCase().includes('owner') ||
        line.toLowerCase().includes('head') ||
        line.toLowerCase().includes('senior') ||
        line.toLowerCase().includes('junior') ||
        line.toLowerCase().includes('consultant') ||
        line.toLowerCase().includes('developer') ||
        line.toLowerCase().includes('architect')
      ) &&
      // Make sure it's not a company line (company | location pattern without title keywords)
      !(line.includes('|') && !line.toLowerCase().includes('manager') && !line.toLowerCase().includes('director') && !line.toLowerCase().includes('lead') && !line.toLowerCase().includes('senior'))
    );

    if (isJobTitle) {
      console.log(`✅ Detected job title: "${line}"`);

      // Save previous job
      if (currentJob) {
        if (currentAchievements.length > 0) {
          currentJob.achievements = currentAchievements;
        }
        jobs.push(currentJob);
        console.log(`💼 Added job: ${currentJob.jobTitle} at ${currentJob.company}`);
      }

      // Start new job
      currentJob = {
        type: "job",
        jobTitle: line,
        achievements: [],
        company: "",
        location: "",
        dates: "",
        description: ""
      };
      currentAchievements = [];
      expectingCompanyNext = true;
    }
    // Company and location/dates (contains | and doesn't look like a job title)
    else if (line.includes('|') && currentJob &&
             !line.toLowerCase().includes('manager') &&
             !line.toLowerCase().includes('director') &&
             !line.toLowerCase().includes('lead') &&
             !line.toLowerCase().includes('senior')) {
      const parts = line.split('|').map(p => p.trim());
      currentJob.company = parts[0];

      if (parts[1]) {
        // Check if second part contains dates (years, months, or Present)
        if (/\d{4}/.test(parts[1]) || parts[1].includes('Present') || /\d{4}-\d{2}/.test(parts[1])) {
          currentJob.dates = parts[1];
          console.log(`📅 Set dates from company line: ${currentJob.dates}`);
        } else {
          currentJob.location = parts[1];
          console.log(`📍 Set location: ${currentJob.location}`);
        }
      }

      expectingCompanyNext = false;
      console.log(`🏢 Set company: ${currentJob.company}`);
    }
    // Dates (contains years, months, or Present)
    else if ((/\d{4}/.test(line) || line.includes('Present') || /\d{4}-\d{2}/.test(line)) && currentJob) {
      currentJob.dates = line;
      console.log(`📅 Set dates: ${currentJob.dates}`);
    }
    // Key Achievements header
    else if (line.toLowerCase().includes('key achievements') || line.toLowerCase().includes('achievements:')) {
      // Just a header, continue to next line for actual achievements
      console.log(`🎯 Found achievements header`);
    }
    // Achievements (bullets)
    else if ((line.startsWith('•') || line.startsWith('-')) && currentJob) {
      currentAchievements.push(line);
      console.log(`⭐ Added achievement: ${line.substring(0, 50)}...`);
    }
    // Regular description (longer text that's not a title, company, or date)
    else if (line.length > 15 && currentJob && !currentJob.description &&
             !line.includes('|') && !/^\d{4}/.test(line) && !line.includes('Present')) {
      currentJob.description = line;
      console.log(`📋 Set description: ${line.substring(0, 50)}...`);
    }
    // If we're expecting a company and this line doesn't match other patterns
    else if (expectingCompanyNext && currentJob && !currentJob.company && line.length > 2) {
      currentJob.company = line;
      expectingCompanyNext = false;
      console.log(`🏢 Set company (fallback): ${currentJob.company}`);
    }
  }

  // Add final job
  if (currentJob) {
    if (currentAchievements.length > 0) {
      currentJob.achievements = currentAchievements;
    }
    jobs.push(currentJob);
    console.log(`💼 Added final job: ${currentJob.jobTitle} at ${currentJob.company}`);
  }

  console.log(`📊 Total jobs parsed: ${jobs.length}`);
  return jobs;
}

function parseSkillsSection(lines: string[]): any[] {
  const skillGroups = [];
  let currentGroup = null;

  for (const line of lines) {
    if (line.includes(':')) {
      // Save previous group
      if (currentGroup) {
        skillGroups.push(currentGroup);
      }

      // Start new group
      const [category, skillsText] = line.split(':');
      currentGroup = {
        type: "skill-group",
        category: category.trim(),
        skills: skillsText ? skillsText.split('•').map(s => s.trim()).filter(s => s) : []
      };
    } else if (currentGroup && line.includes('•')) {
      const skills = line.split('•').map(s => s.trim()).filter(s => s);
      currentGroup.skills.push(...skills);
    }
  }

  // Add final group
  if (currentGroup) {
    skillGroups.push(currentGroup);
  }

  // If no structured groups found, create a general skills group
  if (skillGroups.length === 0 && lines.length > 0) {
    const allSkills = lines.join(' ').split(/[•,]/).map(s => s.trim()).filter(s => s);
    skillGroups.push({
      type: "skill-group",
      category: "Technical Skills",
      skills: allSkills
    });
  }

  return skillGroups;
}

function parseEducationSection(lines: string[]): any[] {
  const education = [];
  let currentEdu = null;

  for (const line of lines) {
    // Degree pattern
    if (line.includes(' in ') || line.includes('Bachelor') || line.includes('Master') || line.includes('PhD')) {
      if (currentEdu) education.push(currentEdu);

      currentEdu = {
        type: "education",
        degree: line.split(' in ')[0]?.trim() || line,
        field: line.split(' in ')[1]?.trim() || ""
      };
    }
    // Institution (contains | usually)
    else if (line.includes('|') && currentEdu) {
      const parts = line.split('|').map(p => p.trim());
      currentEdu.institution = parts[0];
      if (parts[1]) currentEdu.location = parts[1];
    }
    // Dates
    else if ((/\d{4}/.test(line) || line.includes('Present')) && currentEdu) {
      currentEdu.dates = line;
    }
    // GPA
    else if (line.includes('GPA') && currentEdu) {
      currentEdu.gpa = line.replace('GPA:', '').trim();
    }
  }

  if (currentEdu) education.push(currentEdu);

  return education;
}

function createCoverLetterDocument(content: string, profile?: any): Document {
  const children: Paragraph[] = [];

  // Split content exactly as it appears in the web UI (preserving line breaks)
  // The web UI uses whitespace-pre-line which preserves \n as line breaks
  const lines = content.split('\n');

  // Convert each line to a Word paragraph with appropriate formatting
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty lines create spacing
    if (line.trim() === '') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '', size: 22, font: "Calibri" })],
          spacing: { after: 150 }
        })
      );
      continue;
    }

    // Determine formatting based on content
    let isHeader = false;
    let isDate = false;
    let isRecipient = false;
    let isSalutation = false;
    let isClosing = false;
    let isSignature = false;
    let alignment = AlignmentType.LEFT;
    let isBold = false;
    let fontSize = 22;
    let color = "000000";

    // Header detection (name, contact info)
    if (profile?.personalInfo) {
      const { firstName, lastName, email, phone, location } = profile.personalInfo;

      // Name line
      if (firstName && lastName && line.includes(firstName) && line.includes(lastName) &&
          !line.includes(email) && !line.toLowerCase().includes('sincerely')) {
        isHeader = true;
        isBold = true;
        fontSize = 28;
        color = "1F4E79";
      }
      // Email or phone line
      else if ((email && line.includes(email)) || (phone && line.includes(phone))) {
        isHeader = true;
        fontSize = 20;
        color = "666666";
      }
      // Location line
      else if (location && line.includes(location) && !line.includes(email)) {
        isHeader = true;
        fontSize = 20;
        color = "666666";
      }
      // LinkedIn line
      else if (line.toLowerCase().includes('linkedin:')) {
        isHeader = true;
        fontSize = 18;
        color = "0066CC";
      }
    }

    // Date detection (formatted date at top right)
    if (/^\w+\s+\d{1,2},\s+\d{4}$/.test(line.trim())) {
      isDate = true;
      alignment = AlignmentType.RIGHT;
    }

    // Recipient info (company/hiring team)
    if (line.includes('Hiring Team') || line.includes('Re:')) {
      isRecipient = true;
      fontSize = 22;
    }

    // Salutation
    if (line.trim().startsWith('Dear ')) {
      isSalutation = true;
      fontSize = 22;
    }

    // Closing detection
    if (line.toLowerCase().includes('sincerely') ||
        line.toLowerCase().includes('best regards') ||
        (line.toLowerCase().includes('thank you') && line.toLowerCase().includes('considering'))) {
      isClosing = true;
      fontSize = 22;
    }

    // Signature (name at end, usually after sincerely)
    if (profile?.personalInfo && i > 0) {
      const { firstName, lastName } = profile.personalInfo;
      const prevLine = lines[i-1] || '';
      if (firstName && lastName && line.includes(firstName) && line.includes(lastName) &&
          (prevLine.toLowerCase().includes('sincerely') || prevLine.toLowerCase().includes('regards'))) {
        isSignature = true;
        isBold = true;
        fontSize = 22;
      }
    }

    // Create the paragraph with appropriate spacing
    let spacingAfter = 100;
    if (isHeader && fontSize === 28) spacingAfter = 150; // Name
    else if (isHeader) spacingAfter = 80; // Contact info
    else if (isDate) spacingAfter = 300; // Date
    else if (isRecipient) spacingAfter = 200; // Company info
    else if (isSalutation) spacingAfter = 200; // Dear...
    else if (isClosing) spacingAfter = 200; // Closing
    else if (isSignature) spacingAfter = 100; // Signature
    else spacingAfter = 200; // Body paragraphs

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: fontSize,
            bold: isBold,
            color: color,
            font: "Calibri"
          })
        ],
        alignment: alignment,
        spacing: { after: spacingAfter }
      })
    );
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 inch
            bottom: 720,
            left: 720,
            right: 720
          }
        }
      },
      children
    }]
  });
}

function formatDateRange(dateStr: string): string {
  if (!dateStr) return dateStr;

  // Handle yyyy-mm - yyyy-mm format (e.g., "2021-08 - 2024-01")
  const yearMonthRangeMatch = dateStr.match(/^(\d{4})-(\d{1,2})\s*[-–—]\s*(\d{4})-(\d{1,2})$/);
  if (yearMonthRangeMatch) {
    const startYear = yearMonthRangeMatch[1];
    const startMonth = yearMonthRangeMatch[2].padStart(2, '0');
    const endYear = yearMonthRangeMatch[3];
    const endMonth = yearMonthRangeMatch[4].padStart(2, '0');
    return `${startMonth}/${startYear} - ${endMonth}/${endYear}`;
  }

  // Handle yyyy - mm format (year - month)
  const yearMonthMatch = dateStr.match(/^(\d{4})\s*[-–—]\s*(\d{1,2})$/);
  if (yearMonthMatch) {
    const year = yearMonthMatch[1];
    const month = yearMonthMatch[2].padStart(2, '0');
    return `${month}/${year}`;
  }

  // Handle "Present" dates
  if (dateStr.toLowerCase().includes('present')) {
    const parts = dateStr.split(/[-–—]/);
    if (parts.length >= 2) {
      const startDate = formatSingleDate(parts[0].trim());
      return `${startDate} - Present`;
    }
    return dateStr;
  }

  // Handle date ranges with hyphens or dashes
  if (dateStr.includes('-') || dateStr.includes('–') || dateStr.includes('—')) {
    const parts = dateStr.split(/[-–—]/);
    if (parts.length >= 2) {
      const startDate = formatSingleDate(parts[0].trim());
      const endDate = formatSingleDate(parts[1].trim());
      return `${startDate} - ${endDate}`;
    }
  }

  // Single date
  return formatSingleDate(dateStr);
}

function formatSingleDate(dateStr: string): string {
  if (!dateStr || dateStr.toLowerCase() === 'present') return dateStr;

  // Handle numeric month format (e.g., "01", "02", etc.)
  const numericMonthMatch = dateStr.match(/^(\d{1,2})$/);
  if (numericMonthMatch) {
    const monthNum = numericMonthMatch[1].padStart(2, '0');
    // If it's just a month number, we need context from the range
    return monthNum;
  }

  // Month mappings
  const monthMap: { [key: string]: string } = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };

  // Try to extract year (4 digits)
  const yearMatch = dateStr.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '';

  // Try to extract month name
  const lowerDate = dateStr.toLowerCase();
  let month = '';

  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    if (lowerDate.includes(monthName)) {
      month = monthNum;
      break;
    }
  }

  // If we found both month and year, format as mm/yyyy
  if (month && year) {
    return `${month}/${year}`;
  }

  // If we only have year, return as is
  if (year) {
    return year;
  }

  // Return original if we can't parse
  return dateStr;
}

function parseResumeContent(content: string): {
  name?: string;
  contact?: string;
  summary?: string;
  experience?: string;
  skills?: string;
  education?: string;
} {
  const sections: any = {};

  // Simple parsing - look for common resume sections
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  let currentSection = '';
  let sectionContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers with more specific patterns
    const headerPatterns = [
      /^PROFESSIONAL SUMMARY$/i,
      /^CORE COMPETENCIES$/i,
      /^PROFESSIONAL EXPERIENCE$/i,
      /^EXPERIENCE$/i,
      /^EDUCATION$/i,
      /^SKILLS$/i,
      /^PRIMARY SKILLS:?/i,
      /^ADDITIONAL SKILLS:?/i,
      /^OTHER PROFICIENCIES:?/i
    ];

    const isHeader = headerPatterns.some(pattern => pattern.test(line));

    if (isHeader) {
      // Save previous section
      if (currentSection && sectionContent.length > 0) {
        sections[currentSection] = sectionContent.join('\n').trim();
      }

      // Start new section
      let sectionKey = line.toLowerCase().replace(/[^a-z]/g, '');
      if (sectionKey.includes('summary')) sectionKey = 'summary';
      if (sectionKey.includes('experience')) sectionKey = 'experience';
      if (sectionKey.includes('skill') || sectionKey.includes('competenc')) sectionKey = 'skills';
      if (sectionKey.includes('education')) sectionKey = 'education';

      currentSection = sectionKey;
      sectionContent = [];
    } else if (i === 0 && !currentSection && !line.includes('@') && !line.includes('|')) {
      // First line is likely the name if it doesn't contain contact info
      sections.name = line;
    } else if ((i <= 2) && !currentSection && (line.includes('@') || line.includes('|') || line.includes('LinkedIn'))) {
      // Contact info line
      sections.contact = sections.contact ? `${sections.contact}\n${line}` : line;
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Save last section
  if (currentSection && sectionContent.length > 0) {
    sections[currentSection] = sectionContent.join('\n').trim();
  }

  // If no sections were detected, treat the whole content as a simple resume
  if (Object.keys(sections).length === 0) {
    // Try to extract basic info from the content
    const contentLines = lines;
    if (contentLines.length > 0) {
      sections.name = contentLines[0];
      if (contentLines.length > 1) {
        sections.contact = contentLines[1];
      }
      if (contentLines.length > 2) {
        sections.summary = contentLines.slice(2).join('\n');
      }
    }
  }

  return sections;
}