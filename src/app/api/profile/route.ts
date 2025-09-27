import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { UserProfile } from '@/types/profile';

// Initialize database on first request
let databaseInitialized = false;

async function ensureDatabase() {
  if (!databaseInitialized) {
    await initializeDatabase();
    databaseInitialized = true;
  }
}

// GET profile by user email
export async function GET(request: NextRequest) {
  try {
    await ensureDatabase();

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Get or create user
    let user = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;

    if (user.length === 0) {
      // Create new user
      user = await sql`
        INSERT INTO users (email) VALUES (${userEmail}) RETURNING id
      `;
    }

    const userId = user[0].id;

    // Get profile data
    const [profile, experiences, education, skills, interests] = await Promise.all([
      sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`,
      sql`SELECT * FROM experiences WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT * FROM education WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT * FROM skills WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT * FROM interests WHERE user_id = ${userId} ORDER BY created_at DESC`
    ]);

    const userProfile: UserProfile = {
      personalInfo: {
        firstName: profile[0]?.first_name || '',
        lastName: profile[0]?.last_name || '',
        email: userEmail,
        phone: profile[0]?.phone || '',
        location: profile[0]?.location || '',
        website: profile[0]?.website || '',
        linkedin: profile[0]?.linkedin || '',
        github: profile[0]?.github || ''
      },
      experience: experiences.map(exp => ({
        id: exp.id.toString(),
        jobTitle: exp.job_title,
        company: exp.company,
        location: exp.location || '',
        startDate: exp.start_date || '',
        endDate: exp.end_date || '',
        current: exp.current || false,
        description: exp.description || '',
        achievements: exp.achievements || []
      })),
      education: education.map(edu => ({
        id: edu.id.toString(),
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field || '',
        startDate: edu.start_date || '',
        endDate: edu.end_date || '',
        gpa: edu.gpa || '',
        achievements: edu.achievements || []
      })),
      skills: skills.map(skill => ({
        id: skill.id.toString(),
        name: skill.name,
        level: skill.level || 'intermediate',
        category: skill.category || 'Other'
      })),
      interests: interests.map(interest => interest.name)
    };

    return NextResponse.json({ profile: userProfile });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST/PUT - Save profile
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const body = await request.json();
    const { userEmail, profile } = body;

    if (!userEmail || !profile) {
      return NextResponse.json({ error: 'Email and profile data required' }, { status: 400 });
    }

    // Get or create user
    let user = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;

    if (user.length === 0) {
      user = await sql`
        INSERT INTO users (email) VALUES (${userEmail}) RETURNING id
      `;
    }

    const userId = user[0].id;

    // Upsert personal info
    await sql`
      INSERT INTO user_profiles (
        user_id, first_name, last_name, phone, location, website, linkedin, github
      ) VALUES (
        ${userId}, ${profile.personalInfo.firstName}, ${profile.personalInfo.lastName},
        ${profile.personalInfo.phone}, ${profile.personalInfo.location},
        ${profile.personalInfo.website}, ${profile.personalInfo.linkedin}, ${profile.personalInfo.github}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        website = EXCLUDED.website,
        linkedin = EXCLUDED.linkedin,
        github = EXCLUDED.github,
        updated_at = NOW()
    `;

    // Clear and re-insert experiences
    await sql`DELETE FROM experiences WHERE user_id = ${userId}`;
    if (profile.experience && profile.experience.length > 0) {
      for (const exp of profile.experience) {
        await sql`
          INSERT INTO experiences (
            user_id, job_title, company, location, start_date, end_date, current, description, achievements
          ) VALUES (
            ${userId}, ${exp.jobTitle}, ${exp.company}, ${exp.location || ''},
            ${exp.startDate || ''}, ${exp.endDate || ''}, ${exp.current || false},
            ${exp.description || ''}, ${exp.achievements || []}
          )
        `;
      }
    }

    // Clear and re-insert education
    await sql`DELETE FROM education WHERE user_id = ${userId}`;
    if (profile.education && profile.education.length > 0) {
      for (const edu of profile.education) {
        await sql`
          INSERT INTO education (
            user_id, institution, degree, field, start_date, end_date, gpa, achievements
          ) VALUES (
            ${userId}, ${edu.institution}, ${edu.degree}, ${edu.field || ''},
            ${edu.startDate || ''}, ${edu.endDate || ''}, ${edu.gpa || ''}, ${edu.achievements || []}
          )
        `;
      }
    }

    // Clear and re-insert skills
    await sql`DELETE FROM skills WHERE user_id = ${userId}`;
    if (profile.skills && profile.skills.length > 0) {
      for (const skill of profile.skills) {
        await sql`
          INSERT INTO skills (user_id, name, level, category)
          VALUES (${userId}, ${skill.name}, ${skill.level || 'intermediate'}, ${skill.category || 'Other'})
        `;
      }
    }

    // Clear and re-insert interests
    await sql`DELETE FROM interests WHERE user_id = ${userId}`;
    if (profile.interests && profile.interests.length > 0) {
      for (const interest of profile.interests) {
        await sql`
          INSERT INTO interests (user_id, name)
          VALUES (${userId}, ${interest})
        `;
      }
    }

    return NextResponse.json({ success: true, message: 'Profile saved successfully' });

  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}