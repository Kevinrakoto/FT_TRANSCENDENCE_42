// src/app/providers.tsx
'use client'

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { SocketProvider } from "@/components/SocketProvider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </SessionProvider>
  )
}