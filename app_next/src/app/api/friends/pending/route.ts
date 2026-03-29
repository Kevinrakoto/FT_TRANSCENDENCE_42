// src/app/api/friends/pending/route.ts
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

    const pending = await prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: "PENDING"
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            tankColor: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(pending)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}