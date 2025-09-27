import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured - STORAGE_DATABASE_URL environment variable missing'
      }, { status: 503 });
    }

    console.log('Testing database connection...');

    // Test basic connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful:', result[0]);

    // Initialize database tables
    await initializeDatabase();
    console.log('✅ Database tables initialized');

    // Test a simple query
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    return NextResponse.json({
      success: true,
      message: 'Database connection and setup successful',
      currentTime: result[0].current_time,
      tables: tables.map(t => t.table_name)
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}