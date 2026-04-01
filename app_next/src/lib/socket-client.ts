// lib/socket-client.ts
'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXTAUTH_URL || 'https://localhost:8443';

interface QueuedMessage {
  event: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

interface RateLimitState {
  [event: string]: {
    count: number;
    resetTime: number;
  };
}

let socketInstance: Socket | null = null;
let currentSocketUserId: string | null = null;
let currentSocketUsername: string | null = null;
let isSocketInitialized = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
let messageQueue: QueuedMessage[] = [];
let rateLimitState: RateLimitState = {};
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;

const RATE_LIMIT_WINDOW = 1000;
const MAX_MESSAGES_PER_WINDOW = 10;
const QUEUE_FLUSH_INTERVAL = 2000;
const HEARTBEAT_INTERVAL = 30000;

function initializeSocket(): Socket {
  if (socketInstance && isSocketInitialized) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  socketInstance.on('connect', () => {
    reconnectAttempts = 0;
    if (currentSocketUserId) {
      socketInstance?.emit('join-game', {
        userId: currentSocketUserId,
        username: currentSocketUsername || '',
      });
    }
    flushMessageQueue();
    startHeartbeat();
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[SocketClient] Connection error:', err.message);
    reconnectAttempts++;
  });

  socketInstance.on('disconnect', (reason) => {
    stopHeartbeat();
  });

  socketInstance.io.on('reconnect', (attempt) => {
  });

  socketInstance.io.on('reconnect_attempt', (attempt) => {
  });

  socketInstance.io.on('reconnect_failed', () => {
    console.error('[SOCKET] Reconnection failed after max attempts');
  });

  socketInstance.on('pong', () => {
  });

  isSocketInitialized = true;
  return socketInstance;
}

function startHeartbeat() {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    if (socketInstance?.connected) {
      socketInstance.emit('ping', { timestamp: Date.now() });
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function checkRateLimit(event: string): boolean {
  const now = Date.now();

  if (!rateLimitState[event] || now > rateLimitState[event].resetTime) {
    rateLimitState[event] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  if (rateLimitState[event].count >= MAX_MESSAGES_PER_WINDOW) {
    console.warn('[SOCKET] Rate limit exceeded for event:', event);
    return false;
  }

  rateLimitState[event].count++;
  return true;
}

function queueMessage(event: string, data: unknown) {
  messageQueue.push({
    event,
    data,
    timestamp: Date.now(),
    retries: 0,
  });
}

function flushMessageQueue() {
  if (!socketInstance?.connected || messageQueue.length === 0) return;

  const messages = [...messageQueue];
  messageQueue = [];

  messages.forEach((msg) => {
    if (checkRateLimit(msg.event)) {
      socketInstance?.emit(msg.event, msg.data);
    } else {
      messageQueue.push(msg);
    }
  });
}

function startQueueFlush() {
  setInterval(flushMessageQueue, QUEUE_FLUSH_INTERVAL);
}

startQueueFlush();

export function getSocket(): Socket {
  return initializeSocket();
}

export function disconnectSocket() {
  if (socketInstance?.connected && currentSocketUserId) {
    socketInstance.emit('player-disconnect', { userId: currentSocketUserId });
  }
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  currentSocketUserId = null;
  currentSocketUsername = null;
  isSocketInitialized = false;
  stopHeartbeat();
}

export function getCurrentUserId(): string | null {
  return currentSocketUserId;
}

export function getReconnectAttempts(): number {
  return reconnectAttempts;
}

export function isConnected(): boolean {
  return socketInstance?.connected ?? false;
}

export const chatSocket = {
  connect: (userId: string, username?: string) => {
    if (!userId) return;

    currentSocketUserId = userId;
    currentSocketUsername = username || '';

    const socket = getSocket();

    const emitJoinGame = () => {
      socket.emit('join-game', {
        userId,
        username: currentSocketUsername,
      });
    };

    if (!socket.connected) {
      socket.once('connect', emitJoinGame);
      socket.connect();
    } else {
      emitJoinGame();
    }
  },

  disconnect: () => {
    disconnectSocket();
  },

  joinPrivateRoom: (conversationId: string, userId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('join-private-room', { conversationId, userId });
    }
  },

  leavePrivateRoom: (conversationId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('leave-private-room', { conversationId });
    }
  },

  sendPrivateMessage: (conversationId: string, content: string, userId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      if (checkRateLimit('private-message')) {
        socket.emit('private-message', { conversationId, content, userId });
      } else {
        queueMessage('private-message', { conversationId, content, userId });
      }
    } else {
      queueMessage('private-message', { conversationId, content, userId });
      socket.once('connect', () => flushMessageQueue());
      socket.connect();
    }
  },

  sendTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('typing', { conversationId, userId, isTyping });
    }
  },

  markAsRead: (conversationId: string, messageIds: string[], userId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('mark-messages-read', { conversationId, messageIds, userId });
    }
  },

  emit: (event: string, data?: unknown, useQueue = true) => {
    const socket = getSocket();
    if (socket.connected) {
      if (useQueue && checkRateLimit(event)) {
        socket.emit(event, data);
      } else if (useQueue) {
        queueMessage(event, data);
      } else {
        socket.emit(event, data);
      }
    } else if (useQueue) {
      queueMessage(event, data);
    }
  },

  on(event: string, callback: (...args: unknown[]) => void) {
    getSocket().on(event, callback);
  },

  off(event: string, callback?: (...args: unknown[]) => void) {
    getSocket().off(event, callback);
  },

  updateProfile: (userId: number, updates: { avatar?: string; tankColor?: string; username?: string }) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('profile-update', { userId, updates });
    } else {
      queueMessage('profile-update', { userId, updates });
    }
  },
};