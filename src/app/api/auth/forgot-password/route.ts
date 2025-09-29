import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { sendEmail, createPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    await initializeDatabase();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    // Check if user exists
    const userResult = await sql`
      SELECT id, email, name FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (userResult.length === 0) {
      // Don't reveal whether email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link.'
      });
    }

    const user = userResult[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await sql`
      UPDATE users
      SET reset_token = ${resetToken}, reset_token_expires = ${resetTokenExpiry}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`🔐 Password reset requested for: ${email}`);

    // Send password reset email
    try {
      const resetEmail = createPasswordResetEmail(user.name, resetToken);
      const emailResult = await sendEmail({
        to: user.email,
        subject: resetEmail.subject,
        html: resetEmail.html,
        text: resetEmail.text
      });

      if (emailResult.success) {
        console.log(`📧 Password reset email sent to: ${email}`);
      } else {
        console.warn(`⚠️ Failed to send password reset email to: ${email}`, emailResult.error);
        return NextResponse.json({
          error: 'Failed to send password reset email'
        }, { status: 500 });
      }
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
      return NextResponse.json({
        error: 'Failed to send password reset email'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email address.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}