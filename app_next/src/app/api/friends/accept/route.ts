// src/app/api/friends/accept/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification, emitFriendNotification } from "@/lib/notifications"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { friendshipId } = await req.json()
    const userId = session.user.id

    const result = await prisma.$transaction(async (tx) => {
      const friendship = await tx.friendship.findFirst({
        where: {
          id: parseInt(friendshipId),
          receiverId: userId,
          status: "PENDING"
        }
      })

      if (!friendship) {
        throw new Error("Request not found")
      }

      const updatedFriendship = await tx.friendship.update({
        where: { id: friendship.id },
        data: { status: "ACCEPTED" }
      })

      const conversation = await tx.conversation.create({
        data: {
          type: "PRIVATE",
          user1Id: friendship.senderId,
          user2Id: friendship.receiverId,
          participants: {
            create: [
              { userId: friendship.senderId },
              { userId: friendship.receiverId }
            ]
          }
        }
      })

      return { friendship: updatedFriendship, conversation }
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    })

    await createNotification(
      result.friendship.senderId,
      "FRIEND_ACCEPTED",
      "Friend Request Accepted",
      `${user?.username || 'A user'} accepted your friend request`,
      { userId, friendshipId }
    )

    
    await emitFriendNotification(result.friendship.senderId, 'friend-notification', {
      type: 'friend_accepted',
      friendshipId,
      fromUserId: userId,
      fromUsername: user?.username,
      conversationId: result.conversation.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    )
  }
}