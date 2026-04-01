import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { leaderboard, gameMode } = body

    if (!leaderboard || !Array.isArray(leaderboard)) {
      return NextResponse.json({ error: 'Invalid leaderboard data' }, { status: 400 })
    }

    const playerResults = leaderboard
    .filter((entry: any) => entry.userId === session.user.id) 
    .map((entry: any) => {
      const isWinner = entry.playerNumber === 1
      const killScore = entry.score || 0
      
      return {
        userId: entry.userId,
        username: entry.username,
        rank: entry.playerNumber,
        score: killScore,
        isWinner,
      }
    })

    await prisma.$transaction(async (tx) => {
      for (const result of playerResults) {
        await tx.gameHistory.create({
          data: {
            playerId: result.userId,
            winnerId: result.isWinner ? result.userId : null,
            playerScore: result.score,
          },
        })

        if (result.isWinner) {
          await tx.user.update({
            where: { id: result.userId },
            data: {
              wins: { increment: 1 },
              gamesPlayed: { increment: 1 },
              xp: { increment: 100 },
            },
          })
        } else {
          await tx.user.update({
            where: { id: result.userId },
            data: {
              gamesPlayed: { increment: 1 },
              xp: { increment: 10 },
            },
          })
        }
      }
    })

    return NextResponse.json({ success: true, results: playerResults })
  } catch (error) {
    console.error('Error saving game results:', error)
    return NextResponse.json({ error: 'Failed to save game results' }, { status: 500 })
  }
}
