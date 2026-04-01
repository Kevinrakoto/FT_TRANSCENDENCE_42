// src/components/SocketProvider.tsx
'use client'

import { useEffect, useState, ReactNode, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { chatSocket, getSocket, isConnected as checkSocketConnected } from '@/lib/socket-client'

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const connectedRef = useRef(false)

  useEffect(() => {
    const socket = getSocket()
    const userId = session?.user?.id ? String(session.user.id) : null
    const username = session?.user?.username || ''

    const connectIfNeeded = () => {
      if (userId && !connectedRef.current) {
        chatSocket.connect(userId, username)
        connectedRef.current = true
        setIsConnected(true)
      }
    }

    if (status === 'authenticated' && userId) {
      connectIfNeeded()
    } else if (status === 'unauthenticated' && connectedRef.current) {
      chatSocket.disconnect()
      connectedRef.current = false
      setIsConnected(false)
    }

    const onDisconnect = () => {
      connectedRef.current = false
      setIsConnected(false)
    }

    const onForceLogout = (_data: any) => {
      connectedRef.current = false
      setIsConnected(false)
      socket.disconnect()
     window.location.href = '/';
    }

    const onFriendNotification = (data: any) => {
      window.dispatchEvent(new CustomEvent('friend-notification', { detail: data }))
    }

    const onNewMessage = (data: any) => {
      window.dispatchEvent(new CustomEvent('new-message', { detail: data }))
    }

    const onUserProfileUpdated = (data: any) => {
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: data }))
    }

    socket.on('disconnect', onDisconnect)
    socket.on('force-logout', onForceLogout)
    socket.on('friend-notification', onFriendNotification)
    socket.on('new-message-global', onNewMessage)
    socket.on('user-profile-updated', onUserProfileUpdated)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated' && userId) {
        connectIfNeeded()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('force-logout', onForceLogout)
      socket.off('friend-notification', onFriendNotification)
      socket.off('new-message-global', onNewMessage)
      socket.off('user-profile-updated', onUserProfileUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, status])

  return <>{children}</>
}