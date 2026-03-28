import type { Metadata } from 'next'
import DashboardClient from '@/components/DashboardClient'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View your Tank Battle profile, stats, win rate, and game history.',
}

export default function DashboardPage() {
  return <DashboardClient />
}
