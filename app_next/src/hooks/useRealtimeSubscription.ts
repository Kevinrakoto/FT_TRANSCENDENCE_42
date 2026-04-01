'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type { WebSocketEventMap, ConnectionStatus } from '@/types/websocket';

type EventCallback<T> = (data: T) => void;

interface SubscriptionEvent {
  event: string;
  callback: EventCallback<unknown>;
}

interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  autoSubscribe?: boolean;
}

interface UseRealtimeSubscriptionReturn<T extends keyof WebSocketEventMap> {
  data: WebSocketEventMap[T] | null;
  isLoading: boolean;
  error: Error | null;
  status: ConnectionStatus;
  subscribe: (callback: EventCallback<WebSocketEventMap[T]>) => void;
  unsubscribe: () => void;
  refetch: () => void;
}

export function useRealtimeSubscription<
  T extends keyof WebSocketEventMap
>(
  event: T,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn<T> {
  const { enabled = true, autoSubscribe = true } = options;
  const { status, on, off } = useWebSocketContext();

  const [data, setData] = useState<WebSocketEventMap[T] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callbackRef = useRef<EventCallback<WebSocketEventMap[T]>>(() => {});
  const isSubscribedRef = useRef(false);

  const handleEvent = useCallback(
    (eventData: WebSocketEventMap[T]) => {
      setData(eventData);
      setIsLoading(false);
      setError(null);

      if (callbackRef.current) {
        callbackRef.current(eventData);
      }
    },
    []
  );

  const subscribe = useCallback(
    (callback: EventCallback<WebSocketEventMap[T]>) => {
      if (!enabled || !autoSubscribe) return;

      callbackRef.current = callback as EventCallback<WebSocketEventMap[T]>;
      isSubscribedRef.current = true;
      setIsLoading(true);

      on(event, handleEvent);
    },
    [enabled, autoSubscribe, event, on, handleEvent]
  );

  const unsubscribe = useCallback(() => {
    isSubscribedRef.current = false;
    off(event, handleEvent);
  }, [event, off, handleEvent]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (enabled && autoSubscribe && !isSubscribedRef.current) {
      setIsLoading(true);
      on(event, handleEvent);
      isSubscribedRef.current = true;
    }

    return () => {
      if (isSubscribedRef.current) {
        off(event, handleEvent);
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, autoSubscribe, event, on, off, handleEvent]);

  return {
    data,
    isLoading,
    error,
    status,
    subscribe,
    unsubscribe,
    refetch,
  };
}

export function useRealtimeSubscriptionList<
  T extends keyof WebSocketEventMap
>(
  event: T,
  options: UseRealtimeSubscriptionOptions = {}
): Omit<UseRealtimeSubscriptionReturn<T>, 'data'> & {
  dataList: WebSocketEventMap[T][];
} {
  const { enabled = true, autoSubscribe = true } = options;
  const { status, on, off } = useWebSocketContext();

  const [dataList, setDataList] = useState<WebSocketEventMap[T][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callbackRef = useRef<EventCallback<WebSocketEventMap[T]>>(() => {});
  const isSubscribedRef = useRef(false);

  const handleEvent = useCallback(
    (eventData: WebSocketEventMap[T]) => {
      setDataList((prev) => [...prev, eventData]);
      setIsLoading(false);
      setError(null);

      if (callbackRef.current) {
        callbackRef.current(eventData);
      }
    },
    []
  );

  const subscribe = useCallback(
    (callback: EventCallback<WebSocketEventMap[T]>) => {
      if (!enabled || !autoSubscribe) return;

      callbackRef.current = callback as EventCallback<WebSocketEventMap[T]>;
      isSubscribedRef.current = true;
      setIsLoading(true);

      on(event, handleEvent);
    },
    [enabled, autoSubscribe, event, on, handleEvent]
  );

  const unsubscribe = useCallback(() => {
    isSubscribedRef.current = false;
    off(event, handleEvent);
  }, [event, off, handleEvent]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const clearList = useCallback(() => {
    setDataList([]);
  }, []);

  useEffect(() => {
    if (enabled && autoSubscribe && !isSubscribedRef.current) {
      setIsLoading(true);
      on(event, handleEvent);
      isSubscribedRef.current = true;
    }

    return () => {
      if (isSubscribedRef.current) {
        off(event, handleEvent);
        isSubscribedRef.current = false;
      }
    };
  }, [enabled, autoSubscribe, event, on, off, handleEvent]);

  return {
    dataList,
    isLoading,
    error,
    status,
    subscribe,
    unsubscribe,
    refetch,
    clearList,
  };
}

export function useTypingIndicator(conversationId: string) {
  const { emit, on, off } = useWebSocketContext();
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());

  const typingCallback = useCallback(
    (data: { userId: number; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    on('user-typing', typingCallback as (data: unknown) => void);

    return () => {
      off('user-typing', typingCallback as (data: unknown) => void);
    };
  }, [on, off, typingCallback]);

  const sendTyping = useCallback(
    (userId: string, isTyping: boolean) => {
      emit('typing', { conversationId, userId, isTyping });
    },
    [emit, conversationId]
  );

  return {
    typingUsers,
    sendTyping,
  };
}