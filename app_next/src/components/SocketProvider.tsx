// src/components/SocketProvider.tsx
'use client'

import { useEffect, useState, ReactNode, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { chatSocket, getSocket } from '@/lib/socket-client'

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const connectedRef = useRef(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !connectedRef.current) {
      const userId = String(session.user.id)
      const username = session.user.username || ''
      
      chatSocket.connect(userId, username)
      connectedRef.current = true
      setIsConnected(true)
    } else if (status === 'unauthenticated' && connectedRef.current) {
      chatSocket.disconnect()
      connectedRef.current = false
      setIsConnected(false)
    }

    const socket = getSocket()

    const onDisconnect = () => {
      connectedRef.current = false
      setIsConnected(false)
    }

    const onForceLogout = (_data: any) => {
      connectedRef.current = false
      setIsConnected(false)
      socket.disconnect()
      signOut({ callbackUrl: '/signin' })
    }

    socket.on('disconnect', onDisconnect)
    socket.on('force-logout', onForceLogout)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && session?.user?.id && !connectedRef.current) {
        chatSocket.connect(
          String(session.user.id),
          session.user.username || ''
        )
        connectedRef.current = true
        setIsConnected(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('force-logout', onForceLogout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, status])

  return <>{children}</>
}
