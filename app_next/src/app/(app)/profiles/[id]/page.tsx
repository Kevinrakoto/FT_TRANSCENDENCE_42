import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import UserProfileClient from '@/components/UserProfileClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const userId = parseInt(params.id)
  if (isNaN(userId)) return { title: 'Profile Not Found' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, tankName: true },
  })

  if (!user) return { title: 'Profile Not Found' }

  return {
    title: `${user.username} - Tank Battle`,
    description: `View ${user.username}'s profile on Tank Battle. Tank: ${user.tankName || 'None'}`,
  }
}

async function getUserProfile(userId: number) {
  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        tankName: true,
        tankColor: true,
        tankLevel: true,
        xp: true,
        wins: true,
        kills: true,
        deaths: true,
        gamesPlayed: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        gamesAsPlayer: {
          take: 5,
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
        },
      },
    }),
    prisma.gameHistory.findMany({
      where: { playerId: userId },
      take: 5,
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
  ])

  return user
}

export default async function UserProfilePage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  const userId = parseInt(params.id)

  if (isNaN(userId)) {
    redirect('/home')
  }

  if (userId === session.user.id) {
    redirect('/profiles')
  }

  const user = await getUserProfile(userId)

  if (!user) {
    redirect('/home')
  }

  return (
    <UserProfileClient
      user={user}
      currentUserId={session.user.id}
    />
  )
}
