import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: parseInt(friendId) },
          { receiverId: userId, senderId: parseInt(friendId) }
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

    await prisma.friendship.delete({
      where: { id: friendship.id }
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
