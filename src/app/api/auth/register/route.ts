import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '@/lib/database';
import { sendEmail, createWelcomeEmail } from '@/lib/email';
import { initializeUserSubscription } from '@/lib/subscription-usage-tracker';

// Password strength validation
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    await initializeDatabase();

    const body = await request.json();
    const { name, email, password, selectedPlan = 'free' } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({
        error: 'Name, email, and password are required'
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Please provide a valid email address'
      }, { status: 400 });
    }

    // Password strength validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json({
        error: 'An account with this email already exists'
      }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with proper security
    const result = await sql`
      INSERT INTO users (email, name, password_hash, email_verified, is_admin, created_at, updated_at)
      VALUES (
        ${email.toLowerCase()},
        ${name.trim()},
        ${passwordHash},
        false,
        false,
        NOW(),
        NOW()
      )
      RETURNING id, email, name, email_verified, is_admin, created_at
    `;

    const user = result[0];

    // Initialize user subscription with free plan
    try {
      await initializeUserSubscription(user.id);
      console.log(`✅ Initialized free subscription for user ${user.id}`);
    } catch (error) {
      console.error('Failed to initialize user subscription:', error);
      // Don't fail registration if subscription initialization fails
    }

    console.log(`✅ New user registered: ${email}`);

    // Send welcome email (don't block registration if email fails)
    try {
      const welcomeEmail = createWelcomeEmail(user.name, user.is_admin);
      const emailResult = await sendEmail({
        to: user.email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text
      });

      if (emailResult.success) {
        console.log(`📧 Welcome email sent to: ${email}`);
      } else {
        console.warn(`⚠️ Failed to send welcome email to: ${email}`, emailResult.error);
      }
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      selectedPlan,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      error: 'Internal server error during registration'
    }, { status: 500 });
  }
}