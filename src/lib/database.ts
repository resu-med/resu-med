import { neon } from '@neondatabase/serverless';

// Allow builds to succeed without database URL (for static generation)
const databaseUrl = process.env.STORAGE_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️ No database URL found - checking STORAGE_DATABASE_URL, POSTGRES_URL, DATABASE_URL');
}

export const sql = databaseUrl ? neon(databaseUrl) : null;

// Database initialization function
export async function initializeDatabase() {
  if (!sql) {
    throw new Error('Database not configured - STORAGE_DATABASE_URL environment variable missing');
  }

  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        is_tester BOOLEAN DEFAULT FALSE,
        profile_photo TEXT,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add is_tester column if it doesn't exist (migration)
    try {
      await sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT FALSE
      `;
    } catch (error) {
      // Column might already exist, ignore error
      console.log('is_tester column already exists or could not be added');
    }

    // Create user_profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        location VARCHAR(255),
        website VARCHAR(255),
        linkedin VARCHAR(255),
        github VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;

    // Create experiences table
    await sql`
      CREATE TABLE IF NOT EXISTS experiences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        job_title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        current BOOLEAN DEFAULT FALSE,
        description TEXT,
        achievements TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create education table
    await sql`
      CREATE TABLE IF NOT EXISTS education (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(255) NOT NULL,
        field VARCHAR(255),
        location VARCHAR(255),
        start_date VARCHAR(50),
        end_date VARCHAR(50),
        current BOOLEAN DEFAULT FALSE,
        gpa VARCHAR(20),
        achievements TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create skills table
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        level VARCHAR(50),
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create interests table
    await sql`
      CREATE TABLE IF NOT EXISTS interests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'hobby',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create API usage tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS api_usage (
        id SERIAL PRIMARY KEY,
        api_name VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255),
        request_count INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(api_name, last_reset_date)
      )
    `;

    // Create user subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
        tier VARCHAR(20) NOT NULL DEFAULT 'free',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        current_period_start TIMESTAMP DEFAULT NOW(),
        current_period_end TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;

    // Create user usage tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS user_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        month VARCHAR(7) NOT NULL, -- YYYY-MM format
        job_searches INTEGER DEFAULT 0,
        ai_optimizations INTEGER DEFAULT 0,
        cover_letters_generated INTEGER DEFAULT 0,
        profile_exports INTEGER DEFAULT 0,
        last_job_search TIMESTAMP,
        last_reset_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, month)
      )
    `;

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}