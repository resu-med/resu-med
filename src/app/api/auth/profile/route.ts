import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql, initializeDatabase } from '@/lib/database';

interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

export async function PUT(request: NextRequest) {
  try {
    await initializeDatabase();

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, currentPassword, newPassword } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Get current user
    const userResult = await sql`
      SELECT id, email, name, password
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // If password change is requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user with new password
      await sql`
        UPDATE users
        SET name = ${name}, email = ${email.toLowerCase()}, password = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${decoded.userId}
      `;
    } else {
      // Update user without password change
      await sql`
        UPDATE users
        SET name = ${name}, email = ${email.toLowerCase()}, updated_at = NOW()
        WHERE id = ${decoded.userId}
      `;
    }

    // Get updated user data
    const updatedUserResult = await sql`
      SELECT id, email, name, email_verified, is_admin, created_at, updated_at
      FROM users
      WHERE id = ${decoded.userId}
    `;

    const updatedUser = updatedUserResult.rows[0];

    console.log('✅ Profile updated successfully for:', updatedUser.email);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: updatedUser.email_verified,
        isAdmin: updatedUser.is_admin,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
