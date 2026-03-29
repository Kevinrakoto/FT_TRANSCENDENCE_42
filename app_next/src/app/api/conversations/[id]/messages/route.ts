// src/app/api/conversations/[id]/messages/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const conversationId = parseInt(params.id)
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      )
    }

    const userId = session.user.id

    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            tankColor: true
          }
        },
        readBy: {
          select: { userId: true }
        }
      },
      orderBy: { createdAt: "asc" },
      take: 200
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}