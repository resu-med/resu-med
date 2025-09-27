import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: NextRequest) {
  try {
    const { content, type, filename, profile } = await request.json();

    console.log('📋 PDF Request:', {
      contentLength: content?.length,
      type,
      filename,
      contentPreview: content?.substring(0, 200) + '...'
    });

    if (!content || !type) {
      return NextResponse.json({ error: 'Missing content or type' }, { status: 400 });
    }

    let doc: jsPDF;

    if (type === 'resume') {
      doc = createResumePDF(content, profile);
    } else if (type === 'cover-letter') {
      doc = createCoverLetterPDF(content, profile);
    } else {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Generate the PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    console.log('✅ Generated PDF buffer, size:', pdfBuffer.byteLength);

    // Return the document as a downloadable file
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename?.replace('.docx', '.pdf') || 'document.pdf'}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}

function createResumePDF(content: string, profile?: any): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let currentY = margin;

  console.log('📄 Creating resume PDF, content length:', content.length);

  // Add personal information header from profile if available
  if (profile?.personalInfo) {
    currentY = addPersonalInfoToPDF(doc, profile.personalInfo, currentY, pageWidth, margin);
  }

  // Parse and add resume content
  const sections = parseResumeContent(content);
  currentY = addSectionsToPDF(doc, sections, currentY, maxWidth, margin, pageHeight);

  return doc;
}

function createCoverLetterPDF(content: string, profile?: any): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let currentY = margin;

  console.log('📄 Creating cover letter PDF, content length:', content.length);

  // Add personal information header from profile if available
  if (profile?.personalInfo) {
    currentY = addPersonalInfoToPDF(doc, profile.personalInfo, currentY, pageWidth, margin);
  }

  // Add date
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const dateText = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(dateText, pageWidth - margin, currentY, { align: 'right' });
  currentY += 20;

  // Add content paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  for (const paragraph of paragraphs) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }

    const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
    const lineHeight = 6;

    for (const line of lines) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    }
    currentY += 8; // Extra spacing between paragraphs
  }

  return doc;
}

function addPersonalInfoToPDF(doc: jsPDF, personalInfo: any, startY: number, pageWidth: number, margin: number): number {
  let currentY = startY;

  // Add full name as header
  if (personalInfo.firstName || personalInfo.lastName) {
    const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 78, 121); // Professional blue color
    doc.text(fullName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;
  }

  // Add contact information
  const contactParts = [];
  if (personalInfo.email) contactParts.push(personalInfo.email);
  if (personalInfo.phone) contactParts.push(personalInfo.phone);
  if (personalInfo.location) contactParts.push(personalInfo.location);

  if (contactParts.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(contactParts.join(' | '), pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
  }

  return currentY;
}

function addSectionsToPDF(doc: jsPDF, sections: any, startY: number, maxWidth: number, margin: number, pageHeight: number): number {
  let currentY = startY;

  // Section order for professional appearance
  const sectionOrder = ['summary', 'skills', 'experience', 'education'];

  for (const sectionKey of sectionOrder) {
    if (sections[sectionKey]) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin;
      }

      // Section header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 78, 121);
      const sectionTitle = getSectionTitle(sectionKey);
      doc.text(sectionTitle, margin, currentY);

      // Add underline
      const textWidth = doc.getTextWidth(sectionTitle);
      doc.setDrawColor(31, 78, 121);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY + 2, margin + textWidth, currentY + 2);

      currentY += 10;

      // Section content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      if (sectionKey === 'experience') {
        currentY = addExperienceSection(doc, sections[sectionKey], currentY, maxWidth, margin, pageHeight);
      } else if (sectionKey === 'skills') {
        currentY = addSkillsSection(doc, sections[sectionKey], currentY, maxWidth, margin, pageHeight);
      } else {
        const lines = doc.splitTextToSize(sections[sectionKey], maxWidth);
        const lineHeight = 5;

        for (const line of lines) {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = margin;
          }
          doc.text(line, margin, currentY);
          currentY += lineHeight;
        }
      }

      currentY += 8; // Extra spacing between sections
    }
  }

  return currentY;
}

function addExperienceSection(doc: jsPDF, experienceText: string, startY: number, maxWidth: number, margin: number, pageHeight: number): number {
  let currentY = startY;
  const lines = experienceText.split('\n').filter(line => line.trim());

  let currentJob: any = null;

  for (const line of lines) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }

    // Detect job titles (lines that don't start with bullets and contain job-related keywords)
    const isJobTitle = !line.startsWith('•') && !line.startsWith('-') &&
                      (line.includes('Engineer') || line.includes('Manager') || line.includes('Director') ||
                       line.includes('Lead') || line.includes('Senior') || line.includes('Analyst') ||
                       line.includes('Coordinator') || line.includes('Specialist'));

    if (isJobTitle) {
      if (currentJob) currentY += 5; // Space between jobs

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 78, 121);
      doc.text(line, margin, currentY);
      currentY += 6;
      currentJob = { title: line };
    }
    // Company/location/date lines (contain | or dates)
    else if (line.includes('|') || /\d{4}/.test(line)) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 74, 107);
      doc.text(line, margin, currentY);
      currentY += 5;
    }
    // Achievement bullets
    else if (line.startsWith('•') || line.startsWith('-')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const bulletLines = doc.splitTextToSize(line, maxWidth - 10);
      for (const bulletLine of bulletLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(bulletLine, margin + 10, currentY);
        currentY += 4;
      }
    }
    // Regular description text
    else if (line.trim()) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const descLines = doc.splitTextToSize(line, maxWidth);
      for (const descLine of descLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(descLine, margin, currentY);
        currentY += 4;
      }
    }
  }

  return currentY;
}

function addSkillsSection(doc: jsPDF, skillsText: string, startY: number, maxWidth: number, margin: number, pageHeight: number): number {
  let currentY = startY;
  const lines = skillsText.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }

    if (line.includes(':')) {
      // Skill category
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 74, 107);
      doc.text(line, margin, currentY);
      currentY += 6;
    } else {
      // Skills list
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const skillLines = doc.splitTextToSize(line, maxWidth);
      for (const skillLine of skillLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(skillLine, margin + 10, currentY);
        currentY += 4;
      }
    }
  }

  return currentY;
}

function getSectionTitle(sectionKey: string): string {
  const titles: { [key: string]: string } = {
    summary: 'PROFESSIONAL SUMMARY',
    skills: 'CORE COMPETENCIES',
    experience: 'PROFESSIONAL EXPERIENCE',
    education: 'EDUCATION'
  };
  return titles[sectionKey] || sectionKey.toUpperCase();
}

function parseResumeContent(content: string): any {
  const sections: any = {};
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  let currentSection = '';
  let sectionContent: string[] = [];

  // Section patterns
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
        foundSection = sectionType;
        break;
      }
    }

    if (foundSection) {
      // Save previous section
      if (currentSection && sectionContent.length > 0) {
        sections[currentSection] = sectionContent.join('\n').trim();
      }

      // Start new section
      currentSection = foundSection;
      sectionContent = [];
    } else if (currentSection) {
      // Add content to current section
      sectionContent.push(line);
    } else if (i <= 2 && !line.includes('@') && !line.includes('|')) {
      // Early lines that might be personal info (skip for now as handled by profile)
      continue;
    } else {
      // Content without clear section - treat as summary
      if (!currentSection) {
        currentSection = 'summary';
        sectionContent = [];
      }
      sectionContent.push(line);
    }
  }

  // Add final section
  if (currentSection && sectionContent.length > 0) {
    sections[currentSection] = sectionContent.join('\n').trim();
  }

  return sections;
}