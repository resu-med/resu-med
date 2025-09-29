import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import OpenAI from 'openai';

// Helper function to process parsed text and return response
async function processParsedText(text: string, file: File) {
  // Clean up the text
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines

  // Check if we got meaningful text
  if (!text || text.trim().length < 10) {
    console.warn('⚠️ PDF parsed but very little text extracted. May be image-based PDF.');
    return NextResponse.json(
      {
        error: 'PDF appears to contain mostly images or no readable text. Please try converting to DOCX format or use a text-based PDF.',
        details: 'Only ' + text.trim().length + ' characters of text were extracted.'
      },
      { status: 400 }
    );
  }

  // Use AI to parse the resume text into structured data
  let parsedData = null;
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && text.trim().length > 50) {
    try {
      console.log('🤖 Starting AI-powered resume parsing...');
      const openai = new OpenAI({ apiKey });

      const prompt = `Extract all information from this resume and return ONLY a valid JSON object. Pay special attention to skills and interests sections which may be listed under various headings like "Skills", "Technical Skills", "Core Competencies", "Interests", "Hobbies", "Personal Interests", etc.

IMPORTANT: For work experience, maintain the original order from the resume document OR organize chronologically with the most recent position first. Always include accurate dates.

For skills, extract ALL mentions including:
- Technical skills (programming languages, software, tools)
- Professional skills (project management, leadership, etc.)
- Soft skills (communication, teamwork, etc.)
- Certifications and qualifications

For interests, extract ALL personal interests, hobbies, activities, and pursuits mentioned anywhere in the resume.

Return this exact JSON structure:

{
  "personalInfo": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedIn": "",
    "summary": ""
  },
  "experience": [
    {
      "jobTitle": "",
      "company": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": "",
      "achievements": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "gpa": "",
      "achievements": []
    }
  ],
  "skills": [
    {
      "name": "skill name",
      "level": "intermediate",
      "category": "Technical|Professional|Soft Skills|Other"
    }
  ],
  "interests": [
    {
      "name": "interest name",
      "category": "hobby|volunteer|interest|other",
      "description": ""
    }
  ]
}

Resume text:
${text}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume parser. Extract ALL structured data from resumes with high accuracy. Pay special attention to finding skills and interests which may be scattered throughout the resume or in dedicated sections. Extract technical skills, soft skills, tools, technologies, hobbies, interests, and personal activities. CRITICAL: For work experience, ensure you maintain chronological order with most recent positions first, and include accurate start/end dates in YYYY-MM or YYYY-MM-DD format. Always return valid JSON that matches the exact schema provided. Be precise with dates, job titles, and company names.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        parsedData = JSON.parse(content);
        console.log('✅ AI parsing successful');
        console.log('🔍 Skills found:', parsedData.skills?.length || 0);
        console.log('🔍 Interests found:', parsedData.interests?.length || 0);
        if (parsedData.skills) {
          console.log('📋 Skills:', parsedData.skills.map((s: any) => s.name || s).join(', '));
        }
        if (parsedData.interests) {
          console.log('🌟 Interests:', parsedData.interests.join(', '));
        }
      }
    } catch (error) {
      console.error('AI parsing failed:', error);
      // Continue without AI parsing
    }
  }

  return NextResponse.json({
    text: text.trim(),
    filename: file.name,
    size: file.size,
    parsedData: parsedData
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 PDF Parse API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Convert file to buffer
    console.log('🔄 Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Buffer created, size:', buffer.length, 'bytes');

    let text = '';

    // Parse based on file type
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        console.log('📄 Starting PDF parsing for:', file.name, 'Size:', file.size, 'bytes');

        // Try multiple PDF parsing approaches
        console.log('📦 Attempting PDF parsing...');
        let pdf;
        let pdfParseMethod = 'unknown';

        // Method 1: Try pdf-parse first (works in most environments)
        try {
          pdf = (await import('pdf-parse')).default;
          pdfParseMethod = 'pdf-parse';
          console.log('✅ pdf-parse imported successfully');
        } catch (importError: any) {
          console.log('⚠️ pdf-parse failed, trying pdfjs-dist:', importError.message);

          // Method 2: Fallback to pdfjs-dist (more serverless-friendly)
          try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfParseMethod = 'pdfjs-dist';
            console.log('✅ pdfjs-dist imported successfully');

            // Parse with pdfjs-dist
            const loadingTask = pdfjsLib.getDocument({ data: buffer });
            const pdfDoc = await loadingTask.promise;
            console.log('📑 PDF loaded, pages:', pdfDoc.numPages);

            let text = '';
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
              const page = await pdfDoc.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
              text += pageText + '\n';
            }

            console.log('✅ pdfjs-dist parsing completed, text length:', text.length);

            // Skip the pdf-parse code block since we've already extracted text
            return await processParsedText(text, file);

          } catch (pdfjsError: any) {
            console.error('❌ pdfjs-dist also failed:', pdfjsError);
            return NextResponse.json(
              {
                error: 'PDF parsing libraries not available',
                details: `Both pdf-parse and pdfjs-dist failed. pdf-parse: ${importError.message}, pdfjs-dist: ${pdfjsError.message}`,
                suggestion: 'Please try converting to DOCX format for better compatibility'
              },
              { status: 500 }
            );
          }
        }

        // Add PDF parsing options for better compatibility
        const options = {
          // Increase max buffer size for large PDFs
          max: 0,
        };

        console.log('🔄 Calling pdf-parse with buffer of', buffer.length, 'bytes...');
        const pdfData = await pdf(buffer, options);
        console.log('🎯 PDF parsing completed successfully');

        text = pdfData.text;
        console.log('📝 Raw text extracted, length:', text.length);
        console.log('📑 PDF info - Pages:', pdfData.numpages, 'Version:', pdfData.version);

        return await processParsedText(text, file);

      } catch (error: any) {
        console.error('PDF parsing error details:', error);
        console.error('Error name:', error?.name);
        console.error('Error message:', error?.message);

        // More specific error messages based on error type
        let errorMessage = 'Failed to parse PDF file. ';
        const errorMsg = error?.message || '';

        if (errorMsg.includes('Invalid PDF')) {
          errorMessage += 'The file appears to be corrupted or not a valid PDF.';
        } else if (errorMsg.includes('password')) {
          errorMessage += 'The PDF is password-protected.';
        } else if (errorMsg.includes('encrypted')) {
          errorMessage += 'The PDF is encrypted and cannot be read.';
        } else {
          errorMessage += 'Please try converting to DOCX format or use a different PDF file.';
        }

        return NextResponse.json(
          {
            error: errorMessage,
            details: errorMsg,
            suggestion: 'Try converting your resume to DOCX format for better compatibility.'
          },
          { status: 500 }
        );
      }
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      try {
        console.log('📄 Parsing DOCX file with mammoth');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        console.log('✅ DOCX parsing successful, text length:', text.length);
        return await processParsedText(text, file);
      } catch (error) {
        console.error('DOCX parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse DOCX file. The file may be corrupted or password-protected.' },
          { status: 500 }
        );
      }
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf-8');
      return await processParsedText(text, file);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // This should never be reached due to early returns above
    return await processParsedText(text, file);
  } catch (error) {
    console.error('Resume parsing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while parsing resume' },
      { status: 500 }
    );
  }
}