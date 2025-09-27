import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    await initializeDatabase();

    const body = await request.json();
    const { email, password, confirmDelete } = body;

    // Validation
    if (!email || !password || confirmDelete !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({
        error: 'Email, password, and deletion confirmation are required'
      }, { status: 400 });
    }

    // Find user by email
    const userResult = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    const user = userResult[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 });
    }

    // GDPR Compliant Data Deletion
    // Delete all user data in the correct order (foreign key constraints)
    await sql`DELETE FROM interests WHERE user_id = ${user.id}`;
    await sql`DELETE FROM skills WHERE user_id = ${user.id}`;
    await sql`DELETE FROM education WHERE user_id = ${user.id}`;
    await sql`DELETE FROM experiences WHERE user_id = ${user.id}`;
    await sql`DELETE FROM user_profiles WHERE user_id = ${user.id}`;
    await sql`DELETE FROM users WHERE id = ${user.id}`;

    console.log(`🗑️ GDPR Account deletion completed for: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted in compliance with GDPR.'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({
      error: 'Internal server error during account deletion'
    }, { status: 500 });
  }
}