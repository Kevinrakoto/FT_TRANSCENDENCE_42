// src/app/friends/requests/page.tsx
import FriendRequestsList from '@/components/FriendRequestsList'
import BackButton from '@/components/BackButton'

export default function FriendRequestsPage() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">Demandes d'ami</h1>
      <FriendRequestsList />
    </div>
  )
}