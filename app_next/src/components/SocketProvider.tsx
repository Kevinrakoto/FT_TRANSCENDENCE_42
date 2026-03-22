// src/components/SocketProvider.tsx
'use client'

import { useEffect, useState, ReactNode, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { chatSocket } from '@/lib/socket-client'

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const connectedRef = useRef(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !connectedRef.current) {
      const userId = String(session.user.id)
      const username = session.user.username || ''
      const tankName = session.user.tankName || ''
      
      console.log('[SocketProvider] Connecting socket for user:', userId)
      chatSocket.connect(userId, username, tankName)
      connectedRef.current = true
      setIsConnected(true)
    } else if (status === 'unauthenticated' && connectedRef.current) {
      console.log('[SocketProvider] Disconnecting socket')
      chatSocket.disconnect()
      connectedRef.current = false
      setIsConnected(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && session?.user?.id && !connectedRef.current) {
        console.log('[SocketProvider] Reconnecting socket on visibility change')
        chatSocket.connect(
          String(session.user.id),
          session.user.username || '',
          session.user.tankName || ''
        )
        connectedRef.current = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, status])

  return <>{children}</>
}
