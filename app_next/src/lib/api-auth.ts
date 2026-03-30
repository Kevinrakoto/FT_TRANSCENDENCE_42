import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from './rate-limit';
import { prisma } from '@/lib/prisma';

const db = prisma;

export async function verifyApiKey(req: NextRequest): Promise<{ valid: boolean; error?: string; keyId?: number; userId?: number }> {
  const apiKey = getApiKey(req);
  
  if (!apiKey) {
    return { valid: false, error: 'API key is required. Use X-API-Key header.' };
  }
  
  try {
    const apiKeyRecord = await db.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });
    
    if (!apiKeyRecord) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!apiKeyRecord.isActive) {
      return { valid: false, error: 'API key is deactivated' };
    }
    
    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }
    
    await db.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });
    
    return { valid: true, keyId: apiKeyRecord.id, userId: apiKeyRecord.userId };
  } catch (error) {
    return { valid: false, error: 'Failed to verify API key' };
  }
}

export async function apiKeyAuth(req: NextRequest): Promise<NextResponse | null> {
  const result = await verifyApiKey(req);
  
  if (!result.valid) {
    return NextResponse.json(
      { error: result.error },
      { status: 401 }
    );
  }
  
  return null;
}
