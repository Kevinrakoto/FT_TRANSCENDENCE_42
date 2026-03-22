// src/app/api/profiles/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const db = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { username, tankName } = body

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(username && { username }),
        ...(tankName && { tankName })
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        tankName: true,
        tankLevel: true,
        gamesAsPlayer: true
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Error updating profile' },
      { status: 500 }
    )
  }
}
