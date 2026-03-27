import type { Metadata } from 'next'
import FriendsClient from '@/components/FriendsClient'

export const metadata: Metadata = {
  title: 'Friends',
  description: 'Manage your Tank Battle friends list, add new friends, and start conversations.',
}

export default function FriendsPage() {
  return <FriendsClient />
}
