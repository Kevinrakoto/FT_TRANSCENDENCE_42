import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createNotification, emitFriendNotification } from "@/lib/notifications"

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const friendId = searchParams.get('id')
    const userId = session.user.id

    if (!friendId) {
      return NextResponse.json(
        { error: "Friend ID required" },
        { status: 400 }
      )
    }

    const friendIdInt = parseInt(friendId)

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendIdInt },
          { receiverId: userId, senderId: friendIdInt }
        ],
        status: "ACCEPTED"
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.friendship.delete({
        where: { id: friendship.id }
      })

      const conversation = await tx.conversation.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: friendIdInt },
            { user1Id: friendIdInt, user2Id: userId }
          ]
        }
      })

      if (conversation) {
        await tx.messageRead.deleteMany({
          where: {
            message: { conversationId: conversation.id }
          }
        })

        await tx.message.deleteMany({
          where: { conversationId: conversation.id }
        })

        await tx.conversationParticipant.deleteMany({
          where: { conversationId: conversation.id }
        })

        await tx.conversation.delete({
          where: { id: conversation.id }
        })
      }
    })

    const removedFriendId = friendship.senderId === userId ? friendship.receiverId : friendship.senderId

    await createNotification(
      removedFriendId,
      "FRIEND_REMOVED",
      "Friend Removed",
      "A user removed you from their friends list",
      { userId }
    )

    await emitFriendNotification(removedFriendId, 'friend-notification', {
      type: 'friend_removed',
      fromUserId: userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    )
  }
}
