// src/components/ClientProviders.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { SessionProvider } from "next-auth/react"
import { SocketProvider } from "@/components/SocketProvider"
import { ChatNotificationsProvider } from '@/hooks/useChatNotifications'
import ChatNotification from '@/components/ChatNotification'

export function ClientProviders({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | undefined>()

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.id) {
          setUserId(data.user.id)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <SessionProvider>
      <SocketProvider>
        <ChatNotificationsProvider currentUserId={userId}>
          {children}
          <ChatNotification />
        </ChatNotificationsProvider>
      </SocketProvider>
    </SessionProvider>
  )
}
