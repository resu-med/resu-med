import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Get all users
    const users = await sql`SELECT id, email, name, password_hash, email_verified, created_at FROM users ORDER BY created_at DESC`;

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json({ error: 'Failed to debug users' }, { status: 500 });
  }
}