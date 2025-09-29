import { NextRequest, NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: number;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await initializeDatabase();

    const { name, email, currentPassword, newPassword } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({
        error: 'Name and email are required'
      }, { status: 400 });
    }

    // Check if email is already taken by another user
    const existingUser = await sql`
      SELECT id FROM users
      WHERE email = ${email.toLowerCase()} AND id != ${userId}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json({
        error: 'Email is already taken'
      }, { status: 400 });
    }

    // If password change is requested, verify current password
    let passwordUpdate = {};
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({
          error: 'Current password is required to set a new password'
        }, { status: 400 });
      }

      // Get current password hash
      const userResult = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `;

      if (userResult.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult[0].password_hash);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({
          error: 'Current password is incorrect'
        }, { status: 400 });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      passwordUpdate = { password_hash: hashedPassword };
    }

    // Update user profile
    const updatedUser = await sql`
      UPDATE users
      SET
        name = ${name},
        email = ${email.toLowerCase()},
        ${passwordUpdate.password_hash ? sql`password_hash = ${passwordUpdate.password_hash},` : sql``}
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, email, name, email_verified, is_admin, created_at, updated_at
    `;

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = updatedUser[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}