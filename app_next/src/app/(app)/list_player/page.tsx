import type { Metadata } from 'next'
import OnlinePlayersClient from '@/components/OnlinePlayersClient'

export const metadata: Metadata = {
  title: 'Online Players',
  description: 'See who is online in Tank Battle. Chat with other players and send friend requests.',
}

export default function OnlinePlayersPage() {
  return <OnlinePlayersClient />
}
