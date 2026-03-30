// src/components/ClientProviders.tsx
'use client'

import { ReactNode } from 'react'
import { SessionProvider } from "next-auth/react"
import { SocketProvider } from "@/components/SocketProvider"
import { ChatNotificationsProvider } from '@/hooks/useChatNotifications'
import ChatNotification from '@/components/ChatNotification'
import AuthGuard from '@/components/AuthGuard'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthGuard>
        <SocketProvider>
          <ChatNotificationsProvider>
            {children}
            <ChatNotification />
          </ChatNotificationsProvider>
        </SocketProvider>
      </AuthGuard>
    </SessionProvider>
  )
}
