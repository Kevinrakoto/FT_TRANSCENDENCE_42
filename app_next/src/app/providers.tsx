// src/app/providers.tsx
'use client'

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { SocketProvider } from "@/components/SocketProvider"
import { WebSocketProvider } from "@/contexts/WebSocketContext"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </SocketProvider>
    </SessionProvider>
  )
}
