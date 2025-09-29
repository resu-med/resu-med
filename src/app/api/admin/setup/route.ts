import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import { sendEmail, createWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { email, setupKey } = body;

    // Check if setup key matches environment variable
    const expectedSetupKey = process.env.ADMIN_SETUP_KEY;
    if (!expectedSetupKey || setupKey !== expectedSetupKey) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await initializeDatabase();

    // Check if user exists
    const userResult = await sql`
      SELECT id, email, is_admin
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    if (user.is_admin) {
      return NextResponse.json({
        message: 'User is already an admin',
        user: { id: user.id, email: user.email, isAdmin: true }
      });
    }

    // Make user admin
    await sql`
      UPDATE users
      SET is_admin = TRUE, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    console.log(`✅ User ${email} has been granted admin access`);

    // Send admin welcome email (don't block setup if email fails)
    try {
      const welcomeEmail = createWelcomeEmail(user.name, true);
      const emailResult = await sendEmail({
        to: user.email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text
      });

      if (emailResult.success) {
        console.log(`📧 Admin welcome email sent to: ${email}`);
      } else {
        console.warn(`⚠️ Failed to send admin welcome email to: ${email}`, emailResult.error);
      }
    } catch (emailError) {
      console.error('Admin welcome email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'User has been granted admin access',
      user: { id: user.id, email: user.email, isAdmin: true }
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}