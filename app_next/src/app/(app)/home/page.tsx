import type { Metadata } from 'next'
import HomeClient from '@/components/HomeClient'

export const metadata: Metadata = {
  title: 'Main Menu',
  description: 'Tank Battle main menu. Play solo or multiplayer tank battles, manage your profile, and check the leaderboard.',
}

export default function HomePage() {
  return <HomeClient />
}
