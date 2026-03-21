// lib/socket-client.ts
'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://localhost:3000';

let socketInstance: Socket | null = null;
let currentSocketUserId: string | null = null;
let isSocketInitialized = false;

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
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  socketInstance.on('connect', () => {
    console.log('[SOCKET] Connecté → ID:', socketInstance?.id);
    if (currentSocketUserId) {
      socketInstance?.emit('join-game', { 
        userId: currentSocketUserId,
        username: '',
        tankName: ''
      });
    }
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[SOCKET] Connection error:', err.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected → reason:', reason);
  });

  socketInstance.on('dbl_connex', (data) => {
    console.warn('[SOCKET] Double connection detected:', data.message);
    currentSocketUserId = null;
  });

  isSocketInitialized = true;
  return socketInstance;
}

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
}

export function getCurrentUserId(): string | null {
  return currentSocketUserId;
}

export const chatSocket = {
  connect: (userId: string, username?: string, tankName?: string) => {
    if (!userId) return;
    
    currentSocketUserId = userId;
    
    const socket = getSocket();
    
    const emitJoinGame = () => {
      socket.emit('join-game', { 
        userId, 
        username: username || '', 
        tankName: tankName || '' 
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
      socket.emit('private-message', { conversationId, content, userId });
    } else {
      socket.once('connect', () => {
        socket.emit('private-message', { conversationId, content, userId });
      });
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

  emit: (event: string, data?: any) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(event, data);
    }
  },

  on(event: string, callback: (...args: any[]) => void) {
    getSocket().on(event, callback);
  },

  off(event: string, callback?: (...args: any[]) => void) {
    getSocket().off(event, callback);
  },

  updateProfile: (userId: number, updates: { avatar?: string; tankName?: string; tankColor?: string; username?: string }) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('profile-update', { userId, updates });
    }
  },
};
