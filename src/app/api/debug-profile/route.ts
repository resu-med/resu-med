import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Get user ID
    const user = await sql`SELECT id FROM users WHERE email = ${userEmail}`;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user[0].id;

    // Get raw data from all tables
    const [experiences, education, skills, interests] = await Promise.all([
      sql`SELECT * FROM experiences WHERE user_id = ${userId}`,
      sql`SELECT * FROM education WHERE user_id = ${userId}`,
      sql`SELECT * FROM skills WHERE user_id = ${userId}`,
      sql`SELECT * FROM interests WHERE user_id = ${userId}`
    ]);

    return NextResponse.json({
      userId,
      userEmail,
      rawData: {
        experiences: experiences,
        education: education,
        skills: skills,
        interests: interests
      },
      counts: {
        experiences: experiences.length,
        education: education.length,
        skills: skills.length,
        interests: interests.length
      }
    });

  } catch (error) {
    console.error('Debug profile error:', error);
    return NextResponse.json({ error: 'Failed to debug profile' }, { status: 500 });
  }
}