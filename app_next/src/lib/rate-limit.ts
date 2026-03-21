import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const publicApiLimiter = {
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: NextRequest) => {
    const apiKey = req.headers.get('x-api-key');
    return apiKey || req.ip || 'unknown';
  },
  handler: (req: NextRequest) => {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  },
};

export function checkRateLimit(req: NextRequest): boolean {
  const key = publicApiLimiter.keyGenerator(req);
  const now = Date.now();
  
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + publicApiLimiter.windowMs });
    return true;
  }
  
  if (record.count >= publicApiLimiter.max) {
    return false;
  }
  
  record.count++;
  return true;
}

export function getApiKey(req: NextRequest): string | null {
  return req.headers.get('x-api-key');
}
