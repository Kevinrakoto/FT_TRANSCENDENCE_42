import { PrismaClient, NotificationType } from '@prisma/client';

const db = new PrismaClient();

export async function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  try {
    const notification = await db.notification.create({
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
    const created = await db.notification.createMany({
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
    await fetch('https://localhost:3000/api/emit-friend-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, event, data }),
    });
  } catch {
    // Socket.IO emit is best-effort, user will get notification on next poll
  }
}
