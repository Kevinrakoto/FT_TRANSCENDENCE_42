import { NextRequest, NextResponse } from 'next/server';
import { apiKeyAuth } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  if (!checkRateLimit(request)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const authError = await apiKeyAuth(request);
  if (authError) {
    return authError;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/public/:path*',
};
