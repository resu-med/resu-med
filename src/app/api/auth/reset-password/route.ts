import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, initializeDatabase } from '@/lib/database';

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
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({
        error: 'Reset token and new password are required'
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

    // Find user by reset token and check expiry
    const userResult = await sql`
      SELECT id, email, name, reset_token, reset_token_expires
      FROM users
      WHERE reset_token = ${token}
      AND reset_token_expires > NOW()
    `;

    if (userResult.length === 0) {
      return NextResponse.json({
        error: 'Invalid or expired reset token'
      }, { status: 400 });
    }

    const user = userResult[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          reset_token = NULL,
          reset_token_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`🔐 Password successfully reset for: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}