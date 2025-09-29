import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, createWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, name, isAdmin } = await request.json();

    if (!email || !name) {
      return NextResponse.json({
        error: 'Email and name are required'
      }, { status: 400 });
    }

    // Create and send welcome email
    const welcomeEmail = createWelcomeEmail(name, isAdmin || false);
    const emailResult = await sendEmail({
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text
    });

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        data: emailResult.data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}