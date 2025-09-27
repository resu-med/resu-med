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

  const children: Paragraph[] = [];

  // Parse the UI-generated content directly (no AI needed)
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line) continue;

    // Section headers (all caps)
    if (line === line.toUpperCase() &&
        (line.includes('PROFESSIONAL SUMMARY') ||
         line.includes('CORE COMPETENCIES') ||
         line.includes('PROFESSIONAL EXPERIENCE') ||
         line.includes('EDUCATION'))) {

      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: 28,
            color: "1F4E79",
            font: "Calibri"
          })
        ],
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: "1F4E79",
            size: 6,
            style: BorderStyle.SINGLE
          }
        }
      }));
    }
    // Job titles (contain | and job keywords)
    else if (line.includes('|') &&
             (line.includes('Director') || line.includes('Manager') ||
              line.includes('Lead') || line.includes('Senior') ||
              line.includes('Analyst') || line.includes('Engineer'))) {

      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: 24,
            color: "1F4E79",
            font: "Calibri"
          })
        ],
        spacing: { before: 300, after: 100 }
      }));
    }
    // Date lines (contain years or Present)
    else if (/\d{4}/.test(line) && (line.includes('-') || line.includes('Present'))) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            italic: true,
            size: 20,
            color: "666666",
            font: "Calibri"
          })
        ],
        spacing: { after: 150 }
      }));
    }
    // Bullet points
    else if (line.startsWith('•') || line.startsWith('-')) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 20,
            font: "Calibri"
          })
        ],
        spacing: { after: 100 },
        indent: { left: 360 }
      }));
    }
    // Skill category headers (contain :)
    else if (line.includes(':') && line.length < 100) {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            size: 22,
            color: "2D4A6B",
            font: "Calibri"
          })
        ],
        spacing: { before: 200, after: 100 }
      }));
    }
    // Regular paragraphs
    else {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 20,
            font: "Calibri"
          })
        ],
        spacing: { after: 150 }
      }));
    }
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
  const children: Paragraph[] = [];

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
    let isHeader = false;
    let isDate = false;
    let isRecipient = false;
    let isSalutation = false;
    let isSignature = false;

    // Name (first line with person's name)
    if (profile?.personalInfo && i < 3) {
      const { firstName, lastName } = profile.personalInfo;
      if (firstName && lastName && line.includes(firstName) && line.includes(lastName)) {
        isHeader = true;
        isBold = true;
        fontSize = 28;
        color = "1F4E79";
      }
    }

    // Contact info (email, phone, location)
    if (line.includes('@') || line.includes('|') || /\d{5}/.test(line)) {
      isHeader = true;
      fontSize = 20;
      color = "666666";
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
    if (isHeader && fontSize === 28) spacingAfter = 150; // Name
    else if (isHeader) spacingAfter = 80; // Contact info
    else if (isDate) spacingAfter = 300; // Date
    else if (isRecipient) spacingAfter = 200; // Company info
    else if (isSalutation) spacingAfter = 200; // Dear...
    else if (isSignature) spacingAfter = 0; // Signature

    let alignment = AlignmentType.LEFT;
    if (isHeader && fontSize === 28) alignment = AlignmentType.CENTER; // Center name
    else if (isHeader && !line.includes('Re:')) alignment = AlignmentType.CENTER; // Center contact info

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