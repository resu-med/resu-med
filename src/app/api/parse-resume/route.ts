import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = '';

    // Parse based on file type
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        // Dynamic import to avoid Next.js issues with pdf-parse
        const pdf = (await import('pdf-parse')).default;
        const pdfData = await pdf(buffer);
        text = pdfData.text;
        console.log('✅ Successfully parsed PDF file:', file.name);
      } catch (error) {
        console.error('PDF parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse PDF file. The file may be corrupted or password-protected. Please try converting to DOCX format.' },
          { status: 500 }
        );
      }
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (error) {
        console.error('DOCX parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse DOCX file. The file may be corrupted or password-protected.' },
          { status: 500 }
        );
      }
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Clean up the text
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines

    // Use AI to parse the resume text into structured data
    let parsedData = null;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && text.trim().length > 50) {
      try {
        console.log('🤖 Starting AI-powered resume parsing...');
        const openai = new OpenAI({ apiKey });

        const prompt = `Please extract information from this resume and return ONLY a valid JSON object with this exact structure:

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
      "startDate": "",
      "endDate": "",
      "gpa": "",
      "achievements": []
    }
  ],
  "skills": [
    {
      "name": "",
      "level": "beginner|intermediate|advanced|expert",
      "category": ""
    }
  ],
  "interests": []
}

Resume text:
${text}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert resume parser. Extract structured data from resumes with high accuracy. Always return valid JSON that matches the exact schema provided. Be precise with dates, job titles, and company names.'
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
  } catch (error) {
    console.error('Resume parsing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while parsing resume' },
      { status: 500 }
    );
  }
}