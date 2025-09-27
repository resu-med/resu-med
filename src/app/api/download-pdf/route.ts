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

function addExperienceSection(doc: jsPDF, experienceData: any[], startY: number, maxWidth: number, margin: number, pageHeight: number): number {
  let currentY = startY;

  for (let i = 0; i < experienceData.length; i++) {
    const job = experienceData[i];

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    // Add spacing between jobs (except for first one)
    if (i > 0) {
      currentY += 8;
    }

    // Job Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 78, 121);
    doc.text(job.title || 'Position', margin, currentY);
    currentY += 8;

    // Company and Location
    if (job.company || job.location) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 74, 107);
      const companyLine = `${job.company || 'Company'}${job.location ? ` | ${job.location}` : ''}`;
      doc.text(companyLine, margin, currentY);
      currentY += 6;
    }

    // Dates
    if (job.dates) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(job.dates, margin, currentY);
      currentY += 10;
    }

    // Description
    if (job.description && job.description.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const descText = job.description.join(' ');
      const descLines = doc.splitTextToSize(descText, maxWidth);

      for (const line of descLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(line, margin, currentY);
        currentY += 5;
      }
      currentY += 3;
    }

    // Achievements
    if (job.achievements && job.achievements.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      for (const achievement of job.achievements) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }

        const bulletText = `• ${achievement}`;
        const bulletLines = doc.splitTextToSize(bulletText, maxWidth - 10);

        for (const line of bulletLines) {
          if (currentY > pageHeight - 30) {
            doc.addPage();
            currentY = margin;
          }
          doc.text(line, margin + 5, currentY);
          currentY += 5;
        }
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
      // Skill category header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 78, 121);
      doc.text(line, margin, currentY);
      currentY += 8;
    } else if (line.includes('•') || line.includes('|')) {
      // Skills list with bullets or separators
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Clean up the line and format it nicely
      const cleanLine = line.replace(/•/g, '').replace(/\|/g, '•').trim();
      const skillLines = doc.splitTextToSize(cleanLine, maxWidth);

      for (const skillLine of skillLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(skillLine, margin, currentY);
        currentY += 6;
      }
    } else if (line.trim()) {
      // Regular skills text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const skillLines = doc.splitTextToSize(line, maxWidth);
      for (const skillLine of skillLines) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(skillLine, margin, currentY);
        currentY += 6;
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
  const sections: any = {
    summary: '',
    skills: '',
    experience: [],
    education: ''
  };

  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  let currentSection = '';
  let sectionContent: string[] = [];
  let currentJob: any = null;

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
        if (currentSection === 'experience' && currentJob) {
          sections.experience.push(currentJob);
          currentJob = null;
        } else if (currentSection !== 'experience') {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
      }

      // Start new section
      currentSection = foundSection;
      sectionContent = [];
    } else if (currentSection === 'experience') {
      // Handle experience section with structured job entries
      if (line.includes('|') && (line.includes('Director') || line.includes('Manager') || line.includes('Lead') || line.includes('Senior') || line.includes('Analyst'))) {
        // This is a job title line
        if (currentJob) {
          sections.experience.push(currentJob);
        }
        const parts = line.split('|').map(p => p.trim());
        currentJob = {
          title: parts[0] || line,
          company: parts[1] || '',
          location: parts[2] || '',
          dates: '',
          description: [],
          achievements: []
        };
      } else if (currentJob && /\d{4}/.test(line) && (line.includes('-') || line.includes('Present'))) {
        // This is a date line
        currentJob.dates = line;
      } else if (currentJob && (line.startsWith('•') || line.startsWith('-'))) {
        // This is an achievement bullet
        currentJob.achievements.push(line.replace(/^[•\-]\s*/, ''));
      } else if (currentJob && line.trim()) {
        // This is description text
        currentJob.description.push(line);
      }
    } else if (currentSection) {
      // Add content to current section
      sectionContent.push(line);
    }
  }

  // Add final section
  if (currentSection && sectionContent.length > 0) {
    if (currentSection === 'experience' && currentJob) {
      sections.experience.push(currentJob);
    } else if (currentSection !== 'experience') {
      sections[currentSection] = sectionContent.join('\n').trim();
    }
  }

  return sections;
}