import type { Metadata } from 'next'
import TankGameClient from '@/components/TankGameClient'

export const metadata: Metadata = {
  title: 'Tank Game',
  description: 'Play Tank Battle, the ultimate multiplayer tank combat game.',
}

export default function TankGamePage() {
  return <TankGameClient />
}
