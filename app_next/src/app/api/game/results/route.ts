import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const body = await request.json()
    const { leaderboard, gameMode } = body

    if (!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) {
      return NextResponse.json({ error: 'Invalid leaderboard data' }, { status: 400 })
    }

    let myEntry = leaderboard.find((e: any) => Number(e.userId) === userId)
    if (leaderboard.length === 1)
        return
    if (!myEntry) {
      return NextResponse.json({ error: 'User not found in leaderboard' }, { status: 400 })
    }

    const isWinner = myEntry.score === 5
    const killScore = myEntry.score || 0

    await prisma.$transaction(async (tx) => {
      await tx.gameHistory.create({
        data: {
          playerId: userId,
          winnerId: isWinner ? userId : null,
          playerScore: killScore,
        },
      })

      if (isWinner) {
        await tx.user.update({
          where: { id: userId },
          data: {
            wins: { increment: 1 },
            gamesPlayed: { increment: 1 },
            xp: { increment: 100 },
          },
        })
      } else {
        await tx.user.update({
          where: { id: userId },
          data: {
            gamesPlayed: { increment: 1 },
            xp: { increment: 10 },
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving game results:', error)
    return NextResponse.json({ error: 'Failed to save game results' }, { status: 500 })
  }
}