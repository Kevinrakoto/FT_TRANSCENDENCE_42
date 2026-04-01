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
  // Use direct socket emit instead of HTTP to avoid SSL cert issues
  try {
    const io = (global as any).__socketIO
    if (!io) {
      return;
    }
    
    const onlinePlayers = (global as any).__onlinePlayers
    if (!onlinePlayers) {
      return;
    }
    
    const targetPlayer = onlinePlayers.get(String(targetUserId));
    
    if (targetPlayer) {
      io.to(targetPlayer.socketId).emit(event, data);
    }
  } catch (error) {
    console.error('[emitFriendNotification] Error:', error);
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
