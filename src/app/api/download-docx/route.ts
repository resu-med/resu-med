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
    return new NextResponse(buffer, {
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
            size: 36,
            color: "1F4E79"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );
  }

  // Add contact information
  const contactParts = [];
  if (personalInfo.email) contactParts.push(personalInfo.email);
  if (personalInfo.phone) contactParts.push(personalInfo.phone);
  if (personalInfo.location) contactParts.push(personalInfo.location);

  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: 22,
            color: "666666"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
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
        Parse this resume content and extract the structured information. Return a JSON object with the following structure:

        {
          "sections": [
            {
              "type": "header", // "header", "experience", "education", "skills", "other"
              "title": "PROFESSIONAL EXPERIENCE",
              "content": [
                {
                  "type": "job", // "job", "education", "skill-group", "text"
                  "jobTitle": "Senior Software Engineer",
                  "company": "Google Inc.",
                  "location": "Mountain View, CA",
                  "dates": "January 2020 - Present",
                  "description": "Job description text",
                  "achievements": ["Achievement 1", "Achievement 2"]
                }
              ]
            }
          ]
        }

        Resume content:
        ${content}

        Extract ALL job titles, company names, dates, and achievements. Be very careful to preserve exact company names and employment dates.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert resume parser. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      console.log('🤖 AI parsed resume structure:', JSON.stringify(parsed, null, 2));
      return parsed;
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
    // Add section header
    if (section.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 28,
              color: "1F4E79"
            })
          ],
          spacing: { before: 400, after: 200 },
          border: {
            bottom: {
              color: "1F4E79",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6
            }
          }
        })
      );
    }

    // Add section content
    if (section.content) {
      for (const item of section.content) {
        if (item.type === 'job') {
          // Add job title
          if (item.jobTitle) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.jobTitle,
                    bold: true,
                    size: 26,
                    color: "1F4E79"
                  })
                ],
                spacing: { before: 300, after: 100 }
              })
            );
          }

          // Add company and location
          if (item.company || item.location) {
            const companyInfo = [item.company, item.location].filter(Boolean).join(' | ');
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: companyInfo,
                    bold: true,
                    size: 22,
                    color: "2D4A6B"
                  })
                ],
                spacing: { after: 100 }
              })
            );
          }

          // Add dates
          if (item.dates) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.dates,
                    italic: true,
                    size: 20,
                    color: "666666"
                  })
                ],
                spacing: { after: 200 }
              })
            );
          }

          // Add description
          if (item.description) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.description,
                    size: 22
                  })
                ],
                spacing: { after: 150 },
                alignment: AlignmentType.JUSTIFIED
              })
            );
          }

          // Add achievements
          if (item.achievements && item.achievements.length > 0) {
            for (const achievement of item.achievements) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: achievement.startsWith('•') ? achievement : `• ${achievement}`,
                      size: 22
                    })
                  ],
                  spacing: { after: 120 },
                  indent: { left: 360 }
                })
              );
            }
          }
        } else if (item.type === 'text') {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.content || item.text || '',
                  size: 22
                })
              ],
              spacing: { after: 150 },
              alignment: AlignmentType.JUSTIFIED
            })
          );
        }
      }
    }
  }

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
          size: 22
        })
      ],
      spacing: { after: 150 }
    })
  );
}

function parseResumeContentFallback(content: string): any {
  // Simple fallback parsing when AI is not available
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  return {
    sections: [
      {
        type: "other",
        title: "Resume Content",
        content: lines.map(line => ({
          type: "text",
          content: line
        }))
      }
    ]
  };
}

function createCoverLetterDocument(content: string, profile?: any): Document {
  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  const children: Paragraph[] = [];

  // Add personal information header from profile if available
  if (profile?.personalInfo) {
    const personalInfo = profile.personalInfo;

    // Add full name as header
    if (personalInfo.firstName || personalInfo.lastName) {
      const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: fullName,
              bold: true,
              size: 28,
              color: "1F4E79"
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 }
        })
      );
    }

    // Add contact information
    const contactParts = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.location) contactParts.push(personalInfo.location);

    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactParts.join(' | '),
              size: 20,
              color: "666666"
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 300 }
        })
      );
    }
  }

  // Add date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          size: 22
        })
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 }
    })
  );

  // Add content paragraphs
  paragraphs.forEach(paragraph => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: paragraph.trim(),
            size: 22
          })
        ],
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED
      })
    );
  });

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