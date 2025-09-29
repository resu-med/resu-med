import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, LevelFormat, convertInchesToTwip } from 'docx';

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

function createResumeDocument(content: string, profile?: any): Document {
  console.log('📄 Creating resume document from UI content, content length:', content.length);

  // Consistent font and size standards
  const FONT_FAMILY = "Calibri";
  const FONTS = {
    NAME: 32,           // 16pt - Name header
    SECTION_HEADER: 28, // 14pt - Section headers
    JOB_TITLE: 24,      // 12pt - Job titles
    COMPANY: 22,        // 11pt - Company names
    BODY: 22,           // 11pt - Body text and bullets
    CONTACT: 20,        // 10pt - Contact info
    DATE: 20            // 10pt - Dates
  };

  const COLORS = {
    PRIMARY: "1F4E79",   // Dark blue for headers
    SECONDARY: "2D4A6B", // Medium blue for companies
    BODY: "000000",      // Black for body text
    MUTED: "666666"      // Gray for dates/contact
  };

  const SPACING = {
    SECTION: 400,        // Before section headers
    SUBSECTION: 300,     // Before job titles
    PARAGRAPH: 150,      // Between paragraphs
    BULLET: 120,         // Between bullet points
    SMALL: 100           // Small spacing
  };

  const children: Paragraph[] = [];

  // Add personal information header first if available
  if (profile?.personalInfo) {
    children.push(...createPersonalInfoHeader(profile.personalInfo));
  }

  // Parse the UI-generated content directly (no AI needed)
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line) continue;

    // Skip personal info lines (already added in header)
    if (line.includes('johnfitzsimons@hotmail.co.uk') ||
        line.includes('07453 942086') ||
        line.includes('linkedin.com/in/john-fitzsimons') ||
        (line.includes('John Fitzsimons') && !line.includes('|'))) continue;

    // Skip ATS keywords section and References (since we hardcode it)
    if (line.includes('ATS OPTIMIZATION') ||
        line.includes('Finance Director, Financial planning') ||
        line.includes('Financial Director, Finance Director, Senior Management') ||
        line.includes('This resume is tailored to highlight') ||
        line.includes('REFERENCES') ||
        line.includes('Available upon request') ||
        line.startsWith('---')) continue;

    // Section headers (remove asterisks and format properly)
    const cleanLine = line.replace(/\*\*/g, '').trim();
    if (cleanLine === cleanLine.toUpperCase() &&
        (cleanLine.includes('PROFESSIONAL SUMMARY') ||
         cleanLine.includes('CORE COMPETENCIES') ||
         cleanLine.includes('SKILLS INVENTORY') ||
         cleanLine.includes('PROFESSIONAL EXPERIENCE') ||
         cleanLine.includes('EDUCATION'))) {

      children.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanLine,
            bold: true,
            size: FONTS.SECTION_HEADER,
            color: COLORS.PRIMARY,
            font: FONT_FAMILY
          })
        ],
        spacing: { before: SPACING.SECTION, after: 200 },
        border: {
          bottom: {
            color: COLORS.PRIMARY,
            size: 6,
            style: BorderStyle.SINGLE
          }
        }
      }));
    }
    // Job titles - detect various patterns for job titles
    else if ((line.includes('|') &&
             (line.includes('Director') || line.includes('Manager') ||
              line.includes('Lead') || line.includes('Senior') ||
              line.includes('Analyst') || line.includes('Engineer'))) ||
             // Also detect standalone job titles without |
             (line.match(/^(Senior Manager|Product Owner|Senior BA|Financial Analyst|Account Manager)$/i))) {

      const cleanJobTitle = line.replace(/\*\*/g, '').trim();
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanJobTitle,
            bold: true,
            size: FONTS.JOB_TITLE,
            color: COLORS.PRIMARY,
            font: FONT_FAMILY
          })
        ],
        spacing: { before: SPACING.SUBSECTION, after: SPACING.SMALL }
      }));
    }
    // Company/location lines (after job titles)
    else if (line.includes('|') &&
             (line.includes('Belfast') || line.includes('Dublin') || line.includes('Coleraine') ||
              line.includes('ESO Solutions') || line.includes('Expleo') || line.includes('Allstate') ||
              line.includes('Liberty IT') || line.includes('Ulster Bank') || line.includes('Citi') ||
              line.includes('BNP Paribas') || line.includes('University of Ulster'))) {

      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: FONTS.COMPANY,
            color: COLORS.SECONDARY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.SMALL }
      }));
    }
    // Date lines (contain years or Present)
    else if (/\d{4}/.test(line) && (line.includes('-') || line.includes('Present'))) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            italic: true,
            size: FONTS.DATE,
            color: COLORS.MUTED,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.PARAGRAPH }
      }));
    }
    // Bullet points - proper Word formatting
    else if (line.startsWith('•') || line.startsWith('-')) {
      // Remove the manual bullet character and create proper Word bullet
      const bulletText = line.replace(/^[•-]\s*/, '');
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: bulletText,
            size: FONTS.BODY,
            color: COLORS.BODY,
            font: FONT_FAMILY
          })
        ],
        spacing: { after: SPACING.BULLET },
        numbering: {
          reference: "bullet-points",
          level: 0
        }
      }));
    }
    // Skill category headers (contain :)
    else if (line.includes(':') && line.length < 100) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: FONTS.BODY,
            color: COLORS.SECONDARY,
            font: FONT_FAMILY
          })
        ],
        spacing: { before: 200, after: SPACING.SMALL }
      }));
    }
    // Regular paragraphs - clean asterisks
    else {
      const cleanText = line.replace(/\*\*/g, '').trim();
      if (cleanText) { // Only add non-empty lines
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: cleanText,
              size: FONTS.BODY,
              color: COLORS.BODY,
              font: FONT_FAMILY
            })
          ],
          spacing: { after: SPACING.PARAGRAPH }
        }));
      }
    }
  }

  // Always add References section at the end
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: "REFERENCES",
        bold: true,
        size: FONTS.SECTION_HEADER,
        color: COLORS.PRIMARY,
        font: FONT_FAMILY
      })
    ],
    spacing: { before: SPACING.SECTION, after: 200 },
    border: {
      bottom: {
        color: COLORS.PRIMARY,
        size: 6,
        style: BorderStyle.SINGLE
      }
    }
  }));

  children.push(new Paragraph({
    children: [
      new TextRun({
        text: "References on request",
        size: FONTS.BODY,
        color: COLORS.BODY,
        font: FONT_FAMILY
      })
    ],
    spacing: { after: SPACING.PARAGRAPH }
  }));

  return new Document({
    numbering: {
      config: [
        {
          reference: "bullet-points",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.25),
                    hanging: convertInchesToTwip(0.25)
                  }
                }
              }
            }
          ]
        }
      ]
    },
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

function createPersonalInfoHeader(personalInfo: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Use consistent formatting constants
  const FONT_FAMILY = "Calibri";
  const FONTS = {
    NAME: 32,           // 16pt - Name header
    CONTACT: 20,        // 10pt - Contact info
    LINKEDIN: 18        // 9pt - LinkedIn
  };

  const COLORS = {
    PRIMARY: "1F4E79",   // Dark blue for headers
    MUTED: "666666"      // Gray for contact info
  };

  // Add full name as header
  if (personalInfo.firstName || personalInfo.lastName) {
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: fullName,
            bold: true,
            size: FONTS.NAME,
            color: COLORS.PRIMARY,
            font: FONT_FAMILY
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 }
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
            size: FONTS.CONTACT,
            color: COLORS.MUTED,
            font: FONT_FAMILY
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    );
  }

  // Add LinkedIn if available
  if (personalInfo.linkedin) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `LinkedIn: ${personalInfo.linkedin}`,
            size: FONTS.LINKEDIN,
            color: COLORS.MUTED,
            font: FONT_FAMILY
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    );
  } else if (contactParts.length > 0) {
    // Add extra spacing if no LinkedIn
    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (lastParagraph) {
      lastParagraph.spacing = { after: 300 };
    }
  }

  return paragraphs;
}

function createCoverLetterDocument(content: string, profile?: any): Document {
  const children: Paragraph[] = [];

  // Add personal information header first if available
  if (profile?.personalInfo) {
    children.push(...createPersonalInfoHeader(profile.personalInfo));
  }

  // Split content exactly as it appears in the web UI (preserving line breaks)
  // The web UI uses whitespace-pre-line which preserves \n as line breaks
  const lines = content.split('\n');

  console.log('📄 Creating cover letter with', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines but preserve spacing
    if (!line.trim()) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '', font: "Calibri" })],
        spacing: { after: 100 }
      }));
      continue;
    }

    // Determine line formatting based on content patterns
    let isBold = false;
    let fontSize = 22; // Default size
    let color = "000000"; // Default black
    let isDate = false;
    let isRecipient = false;
    let isSalutation = false;
    let isSignature = false;

    // Skip personal info lines (already added in header)
    if (profile?.personalInfo) {
      const { firstName, lastName, email, phone, location, linkedin } = profile.personalInfo;

      // Skip name line
      if (firstName && lastName && line.includes(firstName) && line.includes(lastName) && i < 5) {
        continue;
      }

      // Skip contact info lines
      if ((email && line.includes(email)) ||
          (phone && line.includes(phone)) ||
          (location && line.includes(location)) ||
          (linkedin && line.includes(linkedin)) ||
          (line.includes('@') && line.includes('|'))) {
        continue;
      }
    }

    // Date line
    if (/\w+ \d{1,2}, \d{4}/.test(line)) {
      isDate = true;
      fontSize = 20;
      color = "666666";
    }

    // Company/recipient info
    if (line.includes('Re:') || line.includes('Hiring Team')) {
      isRecipient = true;
      isBold = true;
      fontSize = 22;
    }

    // Salutation
    if (line.startsWith('Dear ')) {
      isSalutation = true;
      isBold = true;
      fontSize = 22;
    }

    // Closing
    if (line.includes('Sincerely') || line.includes('Best regards')) {
      isBold = true;
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
    if (isDate) spacingAfter = 300; // Date
    else if (isRecipient) spacingAfter = 200; // Company info
    else if (isSalutation) spacingAfter = 200; // Dear...
    else if (isSignature) spacingAfter = 0; // Signature

    const alignment = AlignmentType.LEFT;

    children.push(new Paragraph({
      children: [
        new TextRun({
          text: line,
          bold: isBold,
          size: fontSize,
          color: color,
          font: "Calibri"
        })
      ],
      alignment: alignment,
      spacing: { after: spacingAfter }
    }));
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