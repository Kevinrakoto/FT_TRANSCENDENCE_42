// src/app/friends/requests/page.tsx
'use client'

import FriendRequestsList from '@/components/FriendRequestsList'
import BackButton from '@/components/BackButton'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { chatSocket } from '@/lib/socket-client'

export default function FriendRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/signin')
    }
  }, [session, status, router])

  const handleLogout = async () => {
    if (session?.user) {
      chatSocket.disconnect()
    }
    await signOut({ redirect: false })
    window.location.href = '/signin'
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="game-container">
      <Link href="/friends" className="friends-button-left" title="friend list">
        <svg 
          className="friends-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      
      <button 
        onClick={handleLogout}
        className="logout-button-left"
        title="Sign out"
      >
        <svg 
          className="logout-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="container mx-auto p-4 max-w-4xl">
        <BackButton />
        <h1 className="text-2xl font-bold mb-6" style={{ marginTop: '20px' }}>Friend Requests</h1>
        <FriendRequestsList />
      </div>
    </div>
  )
}