import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"


const db = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
     const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
		tankColor: true,
        tankLevel: true,
        xp: true,
        wins: true,
        gamesPlayed: true,
        gamesAsPlayer: true,
        isOnline: true,
        lastSeen: true
      },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ user })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}

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
    const { tankColor } = body

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(tankColor && { tankColor })
      },
    })

    return NextResponse.json({ user: updatedUser })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
