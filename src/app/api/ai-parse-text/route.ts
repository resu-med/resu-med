import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI text parsing API called');

    const { text, filename } = await request.json();

    if (!text || typeof text !== 'string') {
      console.error('❌ No text provided in request');
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    console.log('📝 Received text for AI parsing, length:', text.length, 'from file:', filename);

    // Use AI to parse the resume text into structured data
    let parsedData = null;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && text.trim().length > 50) {
      try {
        console.log('🤖 Starting AI-powered resume parsing...');
        const openai = new OpenAI({ apiKey });

        const prompt = `Extract all information from this resume and return ONLY a valid JSON object. Pay special attention to skills and interests sections which may be listed under various headings like "Skills", "Technical Skills", "Core Competencies", "Interests", "Hobbies", "Personal Interests", etc.

IMPORTANT: For work experience, maintain chronological order with the most recent position first. Always include accurate dates in YYYY-MM or YYYY-MM-DD format.

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
            console.log('🌟 Interests:', parsedData.interests.map((i: any) => i.name || i).join(', '));
          }
        }
      } catch (error) {
        console.error('AI parsing failed:', error);
        return NextResponse.json(
          {
            error: 'AI parsing failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            parsedData: null
          },
          { status: 500 }
        );
      }
    } else if (!apiKey) {
      console.warn('⚠️ No OpenAI API key provided');
      return NextResponse.json(
        {
          error: 'AI parsing not available - no API key configured',
          parsedData: null
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: text.trim(),
      filename: filename || 'resume.txt',
      parsedData: parsedData
    });
  } catch (error) {
    console.error('AI text parsing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while parsing text' },
      { status: 500 }
    );
  }
}