'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type {
  ConnectionStatus,
  OnlinePlayer,
  ChatMessage,
  TypingData,
  ReconnectionInfo,
} from '@/types/websocket';

interface OnlineStatus {
  [userId: number]: boolean;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  enableReconnection?: boolean;
}

interface UseWebSocketReturn {
  socket: ReturnType<useWebSocketContext>['socket'];
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  onlinePlayers: OnlinePlayer[];
  onlineUsers: OnlineStatus;
  reconnectionInfo: ReconnectionInfo;
  connect: (userId: string, username: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  emitToRoom: (
    roomId: string,
    event: string,
    data: unknown,
    callback?: (ack: unknown) => void
  ) => void;
  emitPrivate: (
    targetUserId: number,
    event: string,
    data: unknown
  ) => void;
  broadcast: (event: string, data: unknown) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    userId: string
  ) => { optimistcId: string } | null;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  markMessagesRead: (
    conversationId: string,
    messageIds: string[],
    userId: string
  ) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, enableReconnection = true } = options;
  const { data: session, status: sessionStatus } = useSession();
  const {
    socket,
    status,
    onlinePlayers,
    reconnectionInfo,
    connect: contextConnect,
    disconnect: contextDisconnect,
    emit,
    on,
    off,
  } = useWebSocketContext();

  const [onlineUsers, setOnlineUsers] = useState<OnlineStatus>({});
  const throttleRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const optimisticMessagesRef = useRef<Map<string, ChatMessage>>(new Map());

  const userId = session?.user?.id ? String(session.user.id) : null;
  const username = session?.user?.username as string | null;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isReconnecting = status === 'reconnecting';
  const isDisconnected = status === 'disconnected';

  useEffect(() => {
    if (
      autoConnect &&
      sessionStatus === 'authenticated' &&
      userId &&
      username &&
      !socket
    ) {
      contextConnect(userId, username);
    } else if (
      sessionStatus === 'unauthenticated' &&
      socket
    ) {
      contextDisconnect();
    }
  }, [sessionStatus, autoConnect, userId, username, socket, contextConnect, contextDisconnect]);

  useEffect(() => {
    const playersMap: OnlineStatus = {};
    onlinePlayers.forEach((player) => {
      playersMap[player.userId] = true;
    });
    setOnlineUsers(playersMap);
  }, [onlinePlayers]);

  const connect = useCallback(
    (userId: string, username: string) => {
      contextConnect(userId, username);
    },
    [contextConnect]
  );

  const disconnect = useCallback(() => {
    contextDisconnect();
  }, [contextDisconnect]);

  const joinRoom = useCallback(
    (roomId: string) => {
      emit('join-private-room', { conversationId: roomId, userId });
    },
    [emit, userId]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      emit('leave-private-room', { conversationId: roomId });
    },
    [emit]
  );

  const emitToRoom = useCallback(
    (
      roomId: string,
      event: string,
      data: unknown,
      callback?: (ack: unknown) => void
    ) => {
      emit(event, { conversationId: roomId, ...(data as object) }, callback);
    },
    [emit]
  );

  const emitPrivate = useCallback(
    (targetUserId: number, event: string, data: unknown) => {
      const targetPlayer = onlinePlayers.find(
        (p) => p.userId === targetUserId
      );
      if (targetPlayer) {
        emit(event, data);
      }
    },
    [emit, onlinePlayers]
  );

  const broadcast = useCallback(
    (event: string, data: unknown) => {
      emit(event, data);
    },
    [emit]
  );

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      userId: string
    ) => {
      const throttleKey = `message-${conversationId}`;
      if (throttleRef.current.has(throttleKey)) {
        return null;
      }

      const throttleTimeout = setTimeout(() => {
        throttleRef.current.delete(throttleKey);
      }, 500);
      throttleRef.current.set(throttleKey, throttleTimeout);

      emit('private-message', { conversationId, content, userId });

      const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: ChatMessage = {
        id: Number(optimisticId),
        content,
        conversationId: parseInt(conversationId),
        userId: parseInt(userId),
        createdAt: new Date().toISOString(),
        user: {
          id: parseInt(userId),
          username: username || '',
        },
      };
      optimisticMessagesRef.current.set(optimisticId, optimisticMessage);

      return { optimisitcId: optimisticId };
    },
    [emit, username]
  );

  const setTyping = useCallback(
    (conversationId: string, userId: string, isTyping: boolean) => {
      const throttleKey = `typing-${conversationId}-${userId}`;
      if (throttleRef.current.has(throttleKey)) {
        return;
      }

      const throttleTimeout = setTimeout(() => {
        throttleRef.current.delete(throttleKey);
      }, 1000);
      throttleRef.current.set(throttleKey, throttleTimeout);

      emit('typing', { conversationId, userId, isTyping });
    },
    [emit]
  );

  const markMessagesRead = useCallback(
    (conversationId: string, messageIds: string[], userId: string) => {
      emit('mark-messages-read', { conversationId, messageIds, userId });
    },
    [emit]
  );

  return {
    socket,
    status,
    isConnected,
    isConnecting,
    isReconnecting,
    isDisconnected,
    onlinePlayers,
    onlineUsers,
    reconnectionInfo,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    emitToRoom,
    emitPrivate,
    broadcast,
    sendMessage,
    setTyping,
    markMessagesRead,
  };
}