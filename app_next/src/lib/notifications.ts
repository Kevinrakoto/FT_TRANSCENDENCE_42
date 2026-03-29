import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || undefined,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function createNotifications(
  notifications: Array<{
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }>
) {
  try {
    const created = await prisma.notification.createMany({
      data: notifications.map((n) => ({
        ...n,
        data: n.data || undefined,
      })),
    });
    return created;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return null;
  }
}

export async function emitFriendNotification(
  targetUserId: number,
  event: string,
  data: Record<string, any>
) {
  try {
    const https = await import('https')
    const agent = new https.Agent({ rejectUnauthorized: false })
    await fetch('https://localhost:3000/api/emit-friend-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, event, data }),
      // @ts-ignore - Node.js fetch supports agent
      agent,
    });
  } catch {
    // Socket may not be connected - safe to ignore
  }
}

export function emitSocketEvent(event: string, data: Record<string, any>) {
  try {
    const io = (global as any).__socketIO
    if (io) {
      io.emit(event, data)
    }
  } catch {
    // Socket may not be initialized - safe to ignore
  }
}
