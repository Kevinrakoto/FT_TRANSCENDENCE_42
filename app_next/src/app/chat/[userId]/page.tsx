// src/app/chat/[userId]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import PrivateChat from '@/components/PrivateChat'
import PageLayout from '@/components/PageLayout'

interface Props {
  params: {
    userId: string
  }
  searchParams: {
    conversation?: string
  }
}

export default async function ChatPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/signin')
  }

  const currentUserId = session.user.id
  const otherUserId = parseInt(params.userId)
  const conversationId = searchParams.conversation ? parseInt(searchParams.conversation) : null

  if (!conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: currentUserId }
        ]
      }
    })

    if (!conversation) {
      redirect('/friends')
    }
    
    redirect(`/chat/${otherUserId}?conversation=${conversation.id}`)
  }

  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: currentUserId
    }
  })

  if (!participant) {
    redirect('/friends')
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: {
      id: true,
      username: true,
      avatar: true,
      tankName: true,
      tankColor: true,
      isOnline: true
    }
  })

  if (!otherUser) {
    redirect('/friends')
  }

  const currentUser = {
    id: currentUserId,
    username: session.user.username,
    avatar: session.user.avatar,
    tankName: session.user.tankName || '',
    tankColor: session.user.tankColor || '#00ff00'
  }

  return (
    <PageLayout title="Chat" backUrl="/friends">
      <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <PrivateChat 
          conversationId={conversationId}
          currentUser={currentUser}
          otherUser={otherUser}
        />
      </div>
    </PageLayout>
  )
}
