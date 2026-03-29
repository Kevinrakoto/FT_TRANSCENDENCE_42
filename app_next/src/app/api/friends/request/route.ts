// src/app/api/friends/request/route.ts
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

    const { username } = await req.json()
    const senderId = session.user.id

    const receiver = await prisma.user.findUnique({
      where: { username }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: "User not found" , username },
        { status: 404 }
      )
    }
    if (receiver.id === senderId) {
      return NextResponse.json(
        { error: "you can't add yourself" },
        { status: 400 }
      )
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId }
        ]
      }
    })

    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "Friendship request already sent" },
          { status: 400 }
        )
      }
      if (existing.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Already friend" },
          { status: 400 }
        )
      }
      if (existing.status === "DECLINED") {
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "PENDING" }
        })
        
        const sender = await prisma.user.findUnique({
          where: { id: senderId },
          select: { username: true }
        })
    
        await createNotification(
          receiver.id,
          "FRIEND_REQUEST",
          "New Friend Request",
          `${sender?.username || 'A user'} sent you a friend request`,
          { senderId, friendshipId: existing.id }
        )

        await emitFriendNotification(receiver.id, 'friend-notification', {
          type: 'friend_request',
          friendshipId: existing.id,
          fromUserId: senderId,
          fromUsername: sender?.username,
        })
    
        return NextResponse.json({ success: true, message: "Request resent" })
      }
      if (existing.status === "BLOCKED") {
        return NextResponse.json(
          { error: "Cannot send friend request" },
          { status: 403 }
        )
      }
      }
    }

    const friendship = await prisma.friendship.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: "PENDING"
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            tankColor: true
          }
        }
      }
    })

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true }
    })

    await createNotification(
      receiver.id,
      "FRIEND_REQUEST",
      "New Friend Request",
      `${sender?.username || 'A user'} sent you a friend request`,
      { senderId, friendshipId: friendship.id }
    )

    await emitFriendNotification(receiver.id, 'friend-notification', {
      type: 'friend_request',
      friendshipId: friendship.id,
      fromUserId: senderId,
      fromUsername: sender?.username,
    })

    return NextResponse.json(friendship)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    )
  }
}