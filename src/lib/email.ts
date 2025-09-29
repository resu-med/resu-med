import nodemailer from 'nodemailer';

// Initialize Microsoft 365 SMTP transporter
const getEmailTransporter = () => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const transporter = getEmailTransporter();

  if (!transporter) {
    console.warn('SMTP credentials not configured - email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'ResuMed <john@resu-med.com>',
      to,
      subject,
      html,
      text
    });

    console.log('✅ Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function createWelcomeEmail(name: string, isAdmin: boolean = false) {
  const subject = `Welcome to ResuMed${isAdmin ? ' - Admin Access Granted' : ''}!`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ResuMed</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .logo-text {
          font-size: 28px;
          font-weight: bold;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tagline {
          color: #14b8a6;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        h1 {
          color: #1f2937;
          margin: 0 0 16px 0;
          font-size: 24px;
        }
        .admin-badge {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          margin: 8px 0;
        }
        .content {
          margin-bottom: 32px;
        }
        .features {
          background: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
        }
        .features h3 {
          color: #1f2937;
          margin: 0 0 16px 0;
          font-size: 18px;
        }
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .feature-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          color: #4b5563;
        }
        .feature-list li:last-child {
          margin-bottom: 0;
        }
        .checkmark {
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          flex-shrink: 0;
        }
        .cta {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          color: white;
          text-decoration: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-1px);
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
          margin-top: 32px;
        }
        .footer a {
          color: #14b8a6;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <div class="logo-icon">R</div>
            <div>
              <div class="logo-text">ResuMed</div>
              <div class="tagline">Clinical Resume Care</div>
            </div>
          </div>
          <h1>Welcome to ResuMed, ${name}!</h1>
          ${isAdmin ? '<div class="admin-badge">Admin Access</div>' : ''}
        </div>

        <div class="content">
          <p>Thank you for joining ResuMed! We're excited to help you create professional resumes that stand out in the healthcare industry.</p>

          ${isAdmin ? `
            <p><strong>As an administrator</strong>, you have access to all platform features plus:</p>
            <ul>
              <li>🔧 Admin dashboard with user management</li>
              <li>📊 Usage analytics and subscription monitoring</li>
              <li>🚀 API usage tracking</li>
              <li>♾️ Unlimited access to all features</li>
            </ul>
          ` : ''}

          <div class="features">
            <h3>What you can do with ResuMed:</h3>
            <ul class="feature-list">
              <li>
                <span class="checkmark">✓</span>
                Build professional resumes with healthcare-focused templates
              </li>
              <li>
                <span class="checkmark">✓</span>
                Search for jobs across multiple platforms
              </li>
              <li>
                <span class="checkmark">✓</span>
                Generate AI-powered cover letters and professional summaries
              </li>
              <li>
                <span class="checkmark">✓</span>
                Export your resume in multiple formats (PDF, DOCX)
              </li>
              <li>
                <span class="checkmark">✓</span>
                Track your applications and career progress
              </li>
            </ul>
          </div>

          <p>Ready to get started? Click the button below to access your profile and begin building your professional resume.</p>
        </div>

        <div class="cta">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://resu-med.com'}/profile" class="button">
            Start Building Your Resume
          </a>
        </div>

        <div class="footer">
          <p>
            Need help? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://resu-med.com'}/help">help center</a>.
          </p>
          <p>
            Best regards,<br>
            The ResuMed Team
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to ResuMed, ${name}!

Thank you for joining ResuMed! We're excited to help you create professional resumes that stand out in the healthcare industry.

${isAdmin ? `
As an administrator, you have access to all platform features plus:
- Admin dashboard with user management
- Usage analytics and subscription monitoring
- API usage tracking
- Unlimited access to all features
` : ''}

What you can do with ResuMed:
✓ Build professional resumes with healthcare-focused templates
✓ Search for jobs across multiple platforms
✓ Generate AI-powered cover letters and professional summaries
✓ Export your resume in multiple formats (PDF, DOCX)
✓ Track your applications and career progress

Ready to get started? Visit ${process.env.NEXT_PUBLIC_APP_URL || 'https://resu-med.com'}/profile to access your profile and begin building your professional resume.

Need help? Reply to this email or visit our help center at ${process.env.NEXT_PUBLIC_APP_URL || 'https://resu-med.com'}/help.

Best regards,
The ResuMed Team
  `;

  return { subject, html, text };
}

export function createPasswordResetEmail(name: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://resu-med.com'}/reset-password?token=${resetToken}`;

  const subject = 'Reset Your ResuMed Password';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .logo-text {
          font-size: 28px;
          font-weight: bold;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tagline {
          color: #14b8a6;
          font-weight: 600;
          font-size: 14px;
        }
        h1 {
          color: #1f2937;
          margin: 0 0 16px 0;
          font-size: 24px;
        }
        .cta {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          color: white;
          text-decoration: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
        }
        .warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
          color: #92400e;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
          margin-top: 32px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <div class="logo-icon">R</div>
            <div>
              <div class="logo-text">ResuMed</div>
              <div class="tagline">Clinical Resume Care</div>
            </div>
          </div>
          <h1>Reset Your Password</h1>
        </div>

        <p>Hi ${name},</p>

        <p>We received a request to reset your password for your ResuMed account. Click the button below to create a new password:</p>

        <div class="cta">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>

        <div class="warning">
          <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email.
        </div>

        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetUrl}</p>

        <div class="footer">
          <p>
            If you didn't request this password reset, please contact our support team immediately.
          </p>
          <p>
            Best regards,<br>
            The ResuMed Team
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your ResuMed Password

Hi ${name},

We received a request to reset your password for your ResuMed account.

Click this link to create a new password: ${resetUrl}

⚠️ Security Notice: This link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email.

If you didn't request this password reset, please contact our support team immediately.

Best regards,
The ResuMed Team
  `;

  return { subject, html, text };
}