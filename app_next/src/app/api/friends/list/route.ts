// src/app/api/friends/list/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            tankColor: true,
            isOnline: true,
            lastSeen: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            tankColor: true,
            isOnline: true,
            lastSeen: true
          }
        }
      }
    })

    // Return only the friend
    const friends = friendships.map(f => 
      f.senderId === userId ? f.receiver : f.sender
    )

    // For each friend, find the associated conversation
    const friendsWithConversations = await Promise.all(
      friends.map(async (friend) => {
        const conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: friend.id },
              { user1Id: friend.id, user2Id: userId }
            ]
          }
        })
        return { ...friend, conversationId: conversation?.id }
      })
    )

    return NextResponse.json(friendsWithConversations)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}