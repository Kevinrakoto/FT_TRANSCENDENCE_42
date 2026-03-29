import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const db = prisma;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const [totalGames, totalWins, totalXp, recentGames] = await Promise.all([
      db.gameHistory.count({ where: { playerId: userId } }),
      db.gameHistory.count({ where: { playerId: userId, winnerId: userId } }),
      db.user.findUnique({
        where: { id: userId },
        select: { xp: true },
      }),
      db.gameHistory.findMany({
        where: { playerId: userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          opponentId: true,
          winnerId: true,
          playerScore: true,
          opponentScore: true,
          duration: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalGames,
        totalWins,
        totalXp: totalXp?.xp || 0,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        recentGames,
      },
    });
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game stats' },
      { status: 500 }
    );
  }
}
