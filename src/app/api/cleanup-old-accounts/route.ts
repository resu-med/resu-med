import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST() {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Get count of users without password hashes (old accounts)
    const oldAccountsResult = await sql`
      SELECT COUNT(*) as count FROM users WHERE password_hash IS NULL
    `;
    const oldAccountsCount = oldAccountsResult[0].count;

    if (oldAccountsCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No old accounts found to clean up',
        deletedCount: 0
      });
    }

    // Delete old accounts and their associated data
    // Delete in correct order due to foreign key constraints
    await sql`DELETE FROM interests WHERE user_id IN (SELECT id FROM users WHERE password_hash IS NULL)`;
    await sql`DELETE FROM skills WHERE user_id IN (SELECT id FROM users WHERE password_hash IS NULL)`;
    await sql`DELETE FROM education WHERE user_id IN (SELECT id FROM users WHERE password_hash IS NULL)`;
    await sql`DELETE FROM experiences WHERE user_id IN (SELECT id FROM users WHERE password_hash IS NULL)`;
    await sql`DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE password_hash IS NULL)`;

    // Finally delete the users
    const deleteResult = await sql`DELETE FROM users WHERE password_hash IS NULL`;

    console.log(`🗑️ Cleaned up ${oldAccountsCount} old insecure accounts`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up old insecure accounts`,
      deletedCount: oldAccountsCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup old accounts'
    }, { status: 500 });
  }
}