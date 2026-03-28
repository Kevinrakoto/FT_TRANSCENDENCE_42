import type { Metadata } from 'next'
import MultiplayerGameClient from '@/components/MultiplayerGameClient'

export const metadata: Metadata = {
  title: 'Multiplayer Game',
  description: 'Challenge real players in Tank Battle multiplayer mode. Choose from 1v1, 1v1v1, or 4-player battles.',
}

export default function MultiplayerGamePage() {
  return <MultiplayerGameClient />
}
