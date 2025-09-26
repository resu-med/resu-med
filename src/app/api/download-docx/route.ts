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
      doc = createResumeDocument(content, profile);
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

function createResumeDocument(content: string, profile?: any): Document {
  console.log('📄 Creating resume document, content length:', content.length);

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
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: contactParts.join(' | '),
              size: 22,
              color: "666666"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    // Add social links if available
    const socialParts = [];
    if (personalInfo.linkedin) socialParts.push(personalInfo.linkedin);
    if (personalInfo.website) socialParts.push(personalInfo.website);
    if (personalInfo.github) socialParts.push(personalInfo.github);

    if (socialParts.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: socialParts.join(' | '),
              size: 20,
              color: "666666"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );
    }

    // Add professional overview if available
    if (personalInfo.professionalOverview) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: personalInfo.professionalOverview,
              size: 22
            })
          ],
          spacing: { after: 400 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    }
  }

  // Split content into lines and process each line
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  console.log('📄 Total lines to process:', lines.length);
  console.log('📄 First few lines:', lines.slice(0, 5));

  // Process content lines (skip old name/contact detection since we use profile data now)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that look like name or contact info since we handle those from profile
    if (!line.includes('@') && !line.includes('|') && !line.startsWith('**') &&
        !/^(PROFESSIONAL SUMMARY|CORE COMPETENCIES|PRIMARY SKILLS)$/i.test(line) &&
        i < 3 && !profile?.personalInfo) {
      // Only use content for name/contact if no profile data available
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 36,
              color: "1F4E79"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
      continue;
    }

    // Skip contact info lines if we have profile data
    if ((line.includes('@') || line.includes('|') || /\d{3}/.test(line)) &&
        !line.startsWith('**') && !line.includes('Lead') && !line.includes('Director') &&
        profile?.personalInfo) {
      continue;
    }

    // Detect section headers with **
    if (line.startsWith('**') && line.endsWith('**')) {
      const headerText = line.replace(/\*\*/g, '').trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headerText,
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
      continue;
    }

    // Detect other section headers
    const isHeader = /^(PROFESSIONAL SUMMARY|CORE COMPETENCIES|PRIMARY SKILLS|ADDITIONAL SKILLS|OTHER PROFICIENCIES|PROFESSIONAL EXPERIENCE|EDUCATION)$/i.test(line);

    if (isHeader) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
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
      continue;
    }

    // Check if this is a date line (contains years and Present/dates)
    if (/\*\d{4}-\d{2}-\d{2}/.test(line) || (line.includes('Present') && line.includes('*'))) {
      const dateText = line.replace(/\*/g, '').trim();
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: dateText,
              italic: true,
              size: 20,
              color: "666666"
            })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        })
      );
      continue;
    }

    // Job titles and company info (contains | but not dates)
    if (line.includes('|') && !line.startsWith('•') && !line.startsWith('-') &&
        !/\d{4}-\d{2}-\d{2}/.test(line) && !line.includes('Present')) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 24,
              color: "2D4A6B"
            })
          ],
          spacing: { before: 300, after: 50 }
        })
      );
      continue;
    }

    // Bullet points and achievements
    if (line.startsWith('•') || line.startsWith('-')) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.startsWith('-') ? `• ${line.substring(1).trim()}` : line,
              size: 22
            })
          ],
          spacing: { after: 120 },
          indent: { left: 360 } // Indent bullet points
        })
      );
      continue;
    }

    // Skills sections that start with specific patterns
    if (line.startsWith('Primary Skills:') || line.startsWith('Additional Skills:') ||
        line.startsWith('Other Proficiencies:') || line.startsWith('Technical Skills:')) {
      const [label, ...skillsParts] = line.split(':');
      const skills = skillsParts.join(':').trim();

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: label + ':',
              bold: true,
              size: 22,
              color: "2D4A6B"
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      if (skills) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: skills,
                size: 22
              })
            ],
            spacing: { after: 150 },
            indent: { left: 360 }
          })
        );
      }
      continue;
    }

    // Regular content paragraphs
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 22
          })
        ],
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED
      })
    );
  }

  // If no content was processed, add a fallback
  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Resume content could not be processed. Please check the generated content.",
            size: 22
          })
        ]
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