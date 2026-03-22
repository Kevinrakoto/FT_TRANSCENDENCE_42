// src/components/SocketProvider.tsx
'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { chatSocket } from '@/lib/socket-client'

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const userId = String(session.user.id)
      const username = session.user.username || ''
      const tankName = session.user.tankName || ''
      
      chatSocket.connect(userId, username, tankName)
      setIsConnected(true)
    } else if (status === 'unauthenticated') {
      chatSocket.disconnect()
      setIsConnected(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && session?.user?.id) {
        chatSocket.connect(
          String(session.user.id),
          session.user.username || '',
          session.user.tankName || ''
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, status])

  return <>{children}</>
}
