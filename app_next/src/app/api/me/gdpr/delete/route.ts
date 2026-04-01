import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id;

    // Execute deletion in a transaction to handle implicit relationships
    // Since schema.prisma does not have onDelete: Cascade, we must clean manually
    await prisma.$transaction([
      prisma.messageRead.deleteMany({ where: { userId } }),
      prisma.message.deleteMany({ where: { userId } }),
      prisma.conversationParticipant.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      prisma.friendship.deleteMany({ 
        where: { OR: [{ senderId: userId }, { receiverId: userId }] } 
      }),
      prisma.gameHistory.deleteMany({ where: { playerId: userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    return NextResponse.json({ success: true, message: 'Account deleted' }, { status: 200 })
    
  } catch (error) {
    console.error("GDPR Delete Error:", error);
    return NextResponse.json({ error: 'Failed to delete account. There might be lingering dependencies.' }, { status: 500 })
  }
}
