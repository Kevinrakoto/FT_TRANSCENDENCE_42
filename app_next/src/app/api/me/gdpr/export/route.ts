import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
     const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        gamesAsPlayer: true,
        messages: true,
        notifications: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect password hash
    // @ts-ignore
    user.password = undefined;

    return new NextResponse(JSON.stringify(user, null, 2), {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="gdpr-export-${user.username}.json"`,
        'Content-Type': 'application/json',
      },
    })
    
  } catch (error) {
    console.error("GDPR Export Error:", error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
