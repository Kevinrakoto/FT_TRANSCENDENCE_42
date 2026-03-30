// src/app/api/profiles/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { emitSocketEvent } from '@/lib/notifications'

const db = prisma

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
    const { username } = body

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(username && { username }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        tankLevel: true,
        gamesAsPlayer: true
      }
    })

    if (username) {
      emitSocketEvent('user-profile-updated', {
        userId: session.user.id,
        username,
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Error updating profile' },
      { status: 500 }
    )
  }
}
