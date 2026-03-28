import type { Metadata } from 'next'
import SoloGameClient from '@/components/SoloGameClient'

export const metadata: Metadata = {
  title: 'Solo Game',
  description: 'Play solo Tank Battle against AI bots. Practice your skills and earn XP.',
}

export default function SoloGamePage() {
  return <SoloGameClient />
}
