import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req : Request) {
  try
  {
    const {searchParams} = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'wins';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const validSortFields = ['wins', 'gamesPlayed', 'xp'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'wins';

    const players = await prisma.user.findMany({
      select : {
        id: true, 
        username: true, 
        tankLevel: true,
        xp: true,
        wins: true, 
        gamesPlayed: true,
      },
      orderBy: { [sortField]: 'desc' },
      take: limit,
    });

    return NextResponse.json({ leaderboard: players });
  } 
  catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
