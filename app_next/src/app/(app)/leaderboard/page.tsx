import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import LeaderboardClient from '@/components/LeaderboardClient'

export const metadata: Metadata = {
  title: 'Leaderboard - Tank Battle',
  description: 'View the top Tank Battle players. Compare wins, XP, and win rates. Climb the ranks and become the ultimate tank commander.',
  openGraph: {
    title: 'Leaderboard - Tank Battle',
    description: 'View the top Tank Battle players. Compare wins, XP, and win rates.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

async function getLeaderboard() {
  try {
    const players = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        tankLevel: true,
        xp: true,
        wins: true,
        gamesPlayed: true,
      },
      orderBy: { wins: 'desc' },
      take: 20,
    })
    return players
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
}

export default async function LeaderboardPage() {
  const players = await getLeaderboard()

  return <LeaderboardClient initialPlayers={players} />
}
