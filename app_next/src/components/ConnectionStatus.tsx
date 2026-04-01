'use client';

import { useState, useEffect } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { clsx } from 'clsx';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';

interface ConnectionStatusBadgeProps {
  showLabel?: boolean;
  showReconnectInfo?: boolean;
  className?: string;
  variant?: 'badge' | 'dot' | 'full';
}

export function ConnectionStatusBadge({
  showLabel = true,
  showReconnectInfo = true,
  className,
  variant = 'badge',
}: ConnectionStatusBadgeProps) {
  const { status, reconnectionInfo } = useWebSocketContext();
  const [lastOnline, setLastOnline] = useState<Date | null>(null);

  useEffect(() => {
    if (status === 'connected') {
      setLastOnline(new Date());
    }
  }, [status]);

  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Online',
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      color: 'bg-red-500',
      textColor: 'text-red-600',
    },
    reconnecting: {
      icon: Loader2,
      label: 'Reconnecting',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === 'dot') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <span
          className={clsx(
            'relative flex h-2.5 w-2.5',
            status === 'connecting' || status === 'reconnecting'
              ? 'animate-pulse'
              : ''
          )}
        >
          <span
            className={clsx(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              config.color,
              status === 'connecting' || status === 'reconnecting'
                ? 'animate-ping'
                : ''
            )}
          />
          <span
            className={clsx(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              config.color
            )}
          />
        </span>
        {showLabel && (
          <span className={clsx('text-sm', config.textColor)}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between rounded-lg border p-3',
          status === 'connected'
            ? 'border-green-200 bg-green-50'
            : status === 'connecting' || status === 'reconnecting'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-red-200 bg-red-50',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'flex items-center justify-center rounded-full p-1.5',
              config.color,
              'text-white',
              status === 'connecting' || status === 'reconnecting'
                ? 'animate-spin'
                : ''
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className={clsx('font-medium', config.textColor)}>
              {config.label}
            </p>
            {showReconnectInfo &&
              (status === 'reconnecting' || status === 'connecting') && (
                <p className="text-sm text-gray-600">
                  Attempt {reconnectionInfo.attempts}/
                  {reconnectionInfo.maxAttempts} • Retry in{' '}
                  {Math.ceil(reconnectionInfo.nextRetryDelay / 1000)}s
                </p>
              )}
            {status === 'disconnected' && lastOnline && (
              <p className="text-sm text-gray-600">
                Last online: {lastOnline.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        {status === 'disconnected' && reconnectionInfo.attempts >= reconnectionInfo.maxAttempts && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Connection failed</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.color,
        'text-white',
        status === 'connecting' || status === 'reconnecting' ? 'animate-pulse' : '',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface OnlinePlayersIndicatorProps {
  className?: string;
  showCount?: boolean;
}

export function OnlinePlayersIndicator({
  className,
  showCount = true,
}: OnlinePlayersIndicatorProps) {
  const { onlinePlayers } = useWebSocketContext();

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      {showCount && (
        <span className="text-sm text-gray-600">
          {onlinePlayers.length} online
        </span>
      )}
    </div>
  );
}