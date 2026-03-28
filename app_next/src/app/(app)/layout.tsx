import type { Metadata } from 'next'
import { ClientProviders } from "@/components/ClientProviders"

export const metadata: Metadata = {
  title: {
    default: 'Tank Battle',
    template: '%s | Tank Battle',
  },
  description: 'Play multiplayer tank battles, manage your profile, and compete on the leaderboard.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientProviders>
      {children}
    </ClientProviders>
  )
}
