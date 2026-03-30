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

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: parseInt(friendshipId),
        receiverId: userId,
        status: "PENDING"
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      )
    }

    const receiver = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    })

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: "DECLINED" }
    })

    await createNotification(
      friendship.senderId,
      "FRIEND_DENIED",
      "Friend Request Declined",
      `${receiver?.username || 'A user'} declined your friend request`,
      { senderId: userId }
    )

    await emitFriendNotification(friendship.senderId, 'friend-notification', {
      type: 'friend_denied',
      fromUserId: userId,
      fromUsername: receiver?.username,
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
