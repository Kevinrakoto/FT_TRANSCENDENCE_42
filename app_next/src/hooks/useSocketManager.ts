// src/hooks/useSocketManager.ts
'use client'

import { useEffect } from 'react'
import { getSocket } from '@/lib/socket-client'

export function useSocketManager(userId: string | null, username?: string | null) {
  useEffect(() => {
    const socket = getSocket()

    if (userId) {
      if (!socket.connected) {
        socket.connect()
      }
    }

    const handleBeforeUnload = () => {
      if (socket.connected) {
        socket.disconnect()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [userId, username])
}
