import type { Metadata } from 'next'
import ProfilesClient from '@/components/ProfilesClient'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Edit your Tank Battle profile, update your avatar, username, and tank settings.',
}

export default function ProfilesPage() {
  return <ProfilesClient />
}
