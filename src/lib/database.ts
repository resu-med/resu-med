import { neon } from '@neondatabase/serverless';

// Allow builds to succeed without database URL (for static generation)
if (!process.env.STORAGE_DATABASE_URL && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️ STORAGE_DATABASE_URL not set - database features will be disabled');
}

export const sql = process.env.STORAGE_DATABASE_URL ? neon(process.env.STORAGE_DATABASE_URL) : null;

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
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

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
        start_date VARCHAR(50),
        end_date VARCHAR(50),
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}