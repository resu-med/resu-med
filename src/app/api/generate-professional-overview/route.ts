import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { UserProfile } from '@/types/profile';
import jwt from 'jsonwebtoken';
import { canPerformAction, trackUsage } from '@/lib/subscription-usage-tracker';

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
}) : null;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: number;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user can perform AI optimization
    const canOptimize = await canPerformAction(userId, 'ai-optimization');
    if (!canOptimize) {
      return NextResponse.json({
        error: 'AI optimization limit reached. Please upgrade your plan for more optimizations.'
      }, { status: 403 });
    }

    const { profile }: { profile: UserProfile } = await request.json();

    if (!profile.experience.length) {
      return NextResponse.json(
        { error: 'No work experience found in profile' },
        { status: 400 }
      );
    }

    // Prepare experience summary for AI
    const experienceSummary = profile.experience.map(exp => ({
      position: exp.position,
      company: exp.company,
      duration: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || 'N/A'}`,
      description: exp.description,
      achievements: exp.achievements
    }));

    // Prepare skills summary
    const skillsSummary = profile.skills.length > 0
      ? profile.skills.map(skill => `${skill.name} (${skill.level})`).join(', ')
      : 'Skills not specified';

    // Prepare education summary
    const educationSummary = profile.education.length > 0
      ? profile.education.map(edu => `${edu.degree} in ${edu.field} from ${edu.institution}`).join(', ')
      : 'Education not specified';

    const prompt = `
You are a professional resume writer. Create a compelling professional overview/summary for this person based on their profile data.

Personal Information:
- Name: ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}
- Location: ${profile.personalInfo.location}

Work Experience:
${experienceSummary.map(exp => `
- ${exp.position} at ${exp.company} (${exp.duration})
  Description: ${exp.description}
  Key Achievements: ${exp.achievements.join('; ')}
`).join('\n')}

Skills: ${skillsSummary}
Education: ${educationSummary}

Write a professional overview that:
1. Is 2-4 sentences (150-300 words maximum)
2. Highlights key experience and expertise
3. Mentions years of experience or career progression
4. Includes most relevant skills and industries
5. Shows career direction/objectives if apparent
6. Uses professional, confident language
7. Is written in third person (avoid "I" statements)
8. Focuses on value and achievements rather than just job duties

Return ONLY the professional overview text, no additional formatting or explanations.
`;

    // Skip AI generation if no API key is available
    if (!openai) {
      const fallbackOverview = generateFallbackOverview({ profile });
      if (fallbackOverview) {
        // Track usage for fallback generation
        await trackUsage(userId, 'ai-optimization');
        return NextResponse.json({ overview: fallbackOverview });
      }
      throw new Error('No OpenAI API key available and fallback failed');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert resume writer and career counselor. Create compelling, professional overviews that highlight a candidate's strengths and value proposition."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const overview = completion.choices[0]?.message?.content?.trim();

    if (!overview) {
      throw new Error('No overview generated');
    }

    // Track usage after successful generation
    await trackUsage(userId, 'ai-optimization');

    return NextResponse.json({ overview });

  } catch (error) {
    console.error('Error generating professional overview:', error);

    // Fallback overview generation if AI fails
    const fallbackOverview = generateFallbackOverview({ profile });

    if (fallbackOverview) {
      // Track usage for fallback generation too
      await trackUsage(userId, 'ai-optimization');
      return NextResponse.json({ overview: fallbackOverview });
    }

    return NextResponse.json(
      { error: 'Failed to generate professional overview' },
      { status: 500 }
    );
  }
}

// Fallback function for basic overview generation when OpenAI is unavailable
function generateFallbackOverview(data: { profile: UserProfile }): string | null {
  try {
    const { profile } = data;
    const { personalInfo, experience, skills } = profile;

    if (!experience.length) return null;

    const name = `${personalInfo.firstName} ${personalInfo.lastName}`;
    const yearsExperience = experience.length;
    const currentRole = experience[0]; // Assuming most recent is first
    const topSkills = skills.slice(0, 5).map(s => s.name).join(', ');

    let overview = `${name} is `;

    if (currentRole.current) {
      overview += `a ${currentRole.position} at ${currentRole.company}`;
    } else {
      overview += `an experienced professional`;
    }

    if (yearsExperience > 1) {
      overview += ` with experience in multiple roles`;
    }

    overview += `. Demonstrated expertise in ${currentRole.description}`;

    if (topSkills) {
      overview += ` with strong skills in ${topSkills}`;
    }

    overview += `. Proven track record of delivering results and driving professional growth.`;

    return overview;
  } catch (error) {
    console.error('Error in fallback overview generation:', error);
    return null;
  }
}