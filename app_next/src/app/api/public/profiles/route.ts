import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const tankLevel = searchParams.get('tankLevel');

    const where = tankLevel ? {
      tankLevel: parseInt(tankLevel),
    } : {};

    const [profiles, total] = await Promise.all([
      db.user.findMany({
        where,
        take: limit,
        skip: offset,
        select: {
          id: true,
          username: true,
          tankName: true,
          tankLevel: true,
          xp: true,
          wins: true,
          gamesPlayed: true,
          createdAt: true,
        },
        orderBy: { tankLevel: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      data: profiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
