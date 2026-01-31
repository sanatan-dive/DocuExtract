import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/authService';

/**
 * Auth middleware for protected routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const result = await verifyToken(token);

  if (!result.valid || !result.payload) {
    return NextResponse.json(
      { success: false, error: result.error || 'Invalid token' },
      { status: 401 }
    );
  }

  return handler(request, result.payload.userId);
}

/**
 * Extract token from request
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
