import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    if (!session.user?.id) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 400 }
      )
    }

    const currentUserId = Number(session.user.id)

    console.log('Search query:', query, 'currentUserId:', currentUserId)

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        },
        id: {
          not: currentUserId
        }
      },
      select: {
        id: true,
        username: true,
        tankName: true,
        tankColor: true,
        avatar: true,
        isOnline: true
      },
      take: 5
    })

    const friends = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: { in: users.map(u => u.id) } },
          { receiverId: currentUserId, senderId: { in: users.map(u => u.id) } }
        ]
      }
    })

    const results = users.map(user => {
      const friendship = friends.find(f => 
        (f.senderId === user.id && f.receiverId === currentUserId) ||
        (f.receiverId === user.id && f.senderId === currentUserId)
      )

      let status: 'none' | 'pending' | 'friends' = 'none'
      if (friendship) {
        status = friendship.status === 'ACCEPTED' ? 'friends' : 'pending'
      }

      return {
        ...user,
        friendshipStatus: status
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    )
  }
}
