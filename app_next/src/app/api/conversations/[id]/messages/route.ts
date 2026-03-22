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
        { error: "Not authentified" },
        { status: 401 }
      )
    }

    const conversationId = parseInt(params.id)
    const userId = session.user.id

    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    })

    if (!participant) {
      return NextResponse.json(
        { error: "No access autorised" },
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
            tankName: true,
            tankColor: true
          }
        },
        readBy: {
          select: { userId: true }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error server" },
      { status: 500 }
    )
  }
}