import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST() {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Add missing columns to education table if they don't exist
    try {
      await sql`ALTER TABLE education ADD COLUMN IF NOT EXISTS location VARCHAR(255)`;
      await sql`ALTER TABLE education ADD COLUMN IF NOT EXISTS current BOOLEAN DEFAULT FALSE`;
      console.log('✅ Education table columns added');
    } catch (error) {
      console.log('⚠️ Education columns may already exist:', error);
    }

    // Add missing columns to interests table if they don't exist
    try {
      await sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'hobby'`;
      await sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS description TEXT`;
      console.log('✅ Interests table columns added');
    } catch (error) {
      console.log('⚠️ Interests columns may already exist:', error);
    }

    // Add security columns to users table if they don't exist
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`;

      console.log('✅ User security columns added');
    } catch (error) {
      console.log('⚠️ User security columns may already exist:', error);
    }

    // Fix users with null names before making the column NOT NULL
    try {
      await sql`UPDATE users SET name = email WHERE name IS NULL`;
      await sql`ALTER TABLE users ALTER COLUMN name SET NOT NULL`;
      console.log('✅ User name constraints updated');
    } catch (error) {
      console.log('⚠️ User name constraints may already exist:', error);
    }

    // Update existing skill categories to lowercase
    await sql`UPDATE skills SET category = LOWER(category) WHERE category != LOWER(category)`;
    console.log('✅ Skill categories updated to lowercase');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    });

  } catch (error) {
    console.error('❌ Database migration failed:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}