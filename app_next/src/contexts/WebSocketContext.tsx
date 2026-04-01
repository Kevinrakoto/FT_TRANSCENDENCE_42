'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { signOut } from 'next-auth/react';
import type {
  ConnectionStatus,
  OnlinePlayer,
  WebSocketEventMap,
  ReconnectionInfo,
  WebSocketConfig,
} from '@/types/websocket';

interface WebSocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  onlinePlayers: OnlinePlayer[];
  reconnectionInfo: ReconnectionInfo;
  connect: (userId: string, username: string) => void;
  disconnect: () => void;
  emit: <T extends keyof WebSocketEventMap>(
    event: string,
    data?: unknown,
    callback?: (ack: unknown) => void
  ) => void;
  on: <T extends keyof WebSocketEventMap>(
    event: T,
    callback: (data: WebSocketEventMap[T]) => void
  ) => void;
  off: <T extends keyof WebSocketEventMap>(
    event: T,
    callback?: (data: WebSocketEventMap[T]) => void
  ) => void;
}

const defaultReconnectionInfo: ReconnectionInfo = {
  attempts: 0,
  maxAttempts: 5,
  lastAttemptTime: 0,
  nextRetryDelay: 1000,
};

const defaultConfig: WebSocketConfig = {
  url: process.env.NEXTAUTH_URL || 'https://localhost:8443',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 10000,
  transports: ['websocket', 'polling'],
  heartbeat: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
  },
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({
  children,
  config = defaultConfig,
}: {
  children: React.ReactNode;
  config?: Partial<WebSocketConfig>;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [reconnectionInfo, setReconnectionInfo] = useState<ReconnectionInfo>(
    defaultReconnectionInfo
  );

  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserRef = useRef<{ userId: string; username: string } | null>(
    null
  );

  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const startHeartbeat = useCallback((sock: Socket) => {
    if (!mergedConfig.heartbeat.enabled) return;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    const ping = () => {
      if (sock.connected) {
        sock.emit('ping', { timestamp: Date.now() }, (pong: unknown) => {
          if (!pong) {
            console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
            sock.disconnect();
          }
        });
      }
    };

    heartbeatRef.current = setInterval(
      ping,
      mergedConfig.heartbeat.interval
    );
  }, [mergedConfig.heartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const cleanupSocket = useCallback(() => {
    stopHeartbeat();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      if (socketRef.current.connected) {
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    }
    setSocket(null);
  }, [stopHeartbeat]);

  const connect = useCallback(
    (userId: string, username: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-game', { userId, username });
        currentUserRef.current = { userId, username };
        return;
      }

      currentUserRef.current = { userId, username };
      setStatus('connecting');

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const newSocket = io(mergedConfig.url, {
        autoConnect: false,
        reconnection: mergedConfig.reconnection,
        reconnectionAttempts: mergedConfig.reconnectionAttempts,
        reconnectionDelay: mergedConfig.reconnectionDelay,
        reconnectionDelayMax: mergedConfig.reconnectionDelayMax,
        timeout: mergedConfig.timeout,
        transports: mergedConfig.transports,
      });

      newSocket.on('connect', () => {
        setStatus('connected');
        setReconnectionInfo(defaultReconnectionInfo);
        newSocket.emit('join-game', { userId, username });
        startHeartbeat(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        setStatus('disconnected');
        stopHeartbeat();

        if (
          reason === 'io server disconnect' ||
          reason === 'transport close'
        ) {
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('[WebSocket] Connection error:', err.message);
        setStatus('disconnected');
      });

      newSocket.on('reconnect', (attemptNumber) => {
        setStatus('connected');
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        setStatus('reconnecting');
        const delay = Math.min(
          mergedConfig.reconnectionDelay * Math.pow(2, attemptNumber - 1),
          mergedConfig.reconnectionDelayMax
        );
        setReconnectionInfo({
          attempts: attemptNumber,
          maxAttempts: mergedConfig.reconnectionAttempts,
          lastAttemptTime: Date.now(),
          nextRetryDelay: delay,
        });
      });

      newSocket.on('reconnect_failed', () => {
        setStatus('disconnected');
        console.error('[WebSocket] Reconnection failed after max attempts');
      });

      newSocket.on('online-players-update', (players: OnlinePlayer[]) => {
        setOnlinePlayers(players);
      });

      newSocket.on('force-logout', (data: { reason: string }) => {
        console.warn('[WebSocket] Force logout:', data.reason);
        cleanupSocket();
        setStatus('disconnected');
        window.location.href = '/';
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
      newSocket.connect();
    },
    [mergedConfig, startHeartbeat, stopHeartbeat, cleanupSocket]
  );

  const disconnect = useCallback(() => {
    if (currentUserRef.current) {
      socketRef.current?.emit('player-disconnect', {
        userId: currentUserRef.current.userId,
      });
    }
    cleanupSocket();
    setStatus('disconnected');
    setOnlinePlayers([]);
    currentUserRef.current = null;
  }, [cleanupSocket]);

  const emit = useCallback(
    (
      event: string,
      data?: unknown,
      callback?: (ack: unknown) => void
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data, callback);
      } else {
        console.warn('[WebSocket] Cannot emit, not connected:', event);
      }
    },
    []
  );

  const on = useCallback(
    <T extends keyof WebSocketEventMap>(
      event: T,
      callback: (data: WebSocketEventMap[T]) => void
    ) => {
      socketRef.current?.on(event, callback);
    },
    []
  );

  const off = useCallback(
    <T extends keyof WebSocketEventMap>(
      event: T,
      callback?: (data: WebSocketEventMap[T]) => void
    ) => {
      socketRef.current?.off(event, callback as (...args: unknown[]) => void);
    },
    []
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        currentUserRef.current &&
        !socketRef.current?.connected
      ) {
        connect(
          currentUserRef.current.userId,
          currentUserRef.current.username
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect]);

  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, [cleanupSocket]);

  const value = useMemo(
    () => ({
      socket,
      status,
      onlinePlayers,
      reconnectionInfo,
      connect,
      disconnect,
      emit,
      on,
      off,
    }),
    [
      socket,
      status,
      onlinePlayers,
      reconnectionInfo,
      connect,
      disconnect,
      emit,
      on,
      off,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }
  return context;
}