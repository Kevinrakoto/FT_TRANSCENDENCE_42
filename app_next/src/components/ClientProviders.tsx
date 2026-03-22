// src/components/ClientProviders.tsx
'use client'

import { ReactNode } from 'react'
import { SessionProvider } from "next-auth/react"
import { SocketProvider } from "@/components/SocketProvider"
import { ChatNotificationsProvider } from '@/hooks/useChatNotifications'
import ChatNotification from '@/components/ChatNotification'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        <ChatNotificationsProvider>
          {children}
          <ChatNotification />
        </ChatNotificationsProvider>
      </SocketProvider>
    </SessionProvider>
  )
}
