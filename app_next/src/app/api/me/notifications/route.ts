import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const db = prisma;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const isRead = searchParams.get('isRead');

    const where: any = { userId: session.user.id };
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      data: notifications,
      unreadCount,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds, markAllRead } = body;
    const userId = session.user.id;

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true },
      });
    }

    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      message: 'Notifications updated',
      unreadCount,
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
