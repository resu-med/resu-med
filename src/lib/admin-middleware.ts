import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export async function verifyAdminToken(request: NextRequest): Promise<{ isValid: boolean; user?: JWTPayload; error?: string }> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookie
      token = request.cookies.get('auth-token')?.value || null;
    }

    if (!token) {
      return { isValid: false, error: 'No authentication token provided' };
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Check if user is admin
    if (!decoded.isAdmin) {
      return { isValid: false, error: 'Admin access required' };
    }

    return { isValid: true, user: decoded };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { isValid: false, error: 'Invalid token' };
    }
    if (error instanceof jwt.TokenExpiredError) {
      return { isValid: false, error: 'Token expired' };
    }
    return { isValid: false, error: 'Token verification failed' };
  }
}

export function createAdminAPIResponse(error: string, status: number = 403) {
  return new Response(
    JSON.stringify({ error, requiresAdmin: true }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}