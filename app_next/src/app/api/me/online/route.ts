import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { isOnline } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        isOnline: isOnline,
        lastSeen: isOnline ? undefined : new Date()
      },
      select: {
        id: true,
        isOnline: true,
        lastSeen: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating online status:', error)
    return NextResponse.json(
      { error: 'Error updating online status' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isOnline: true,
        lastSeen: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching online status:', error)
    return NextResponse.json(
      { error: 'Error fetching online status' },
      { status: 500 }
    )
  }
}
