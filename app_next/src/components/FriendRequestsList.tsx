// src/components/FriendRequestsList.tsx
'use client'

import { useState, useEffect } from 'react'
import { FriendRequest } from '@/types/chat'

export default function FriendRequestsList() {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const res = await fetch('/api/friends/pending')
    const data = await res.json()
    setRequests(data)
    setLoading(false)
  }

  const acceptRequest = async (friendshipId: number) => {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId })
    })

    if (res.ok) {
      fetchRequests()
    }
  }

  const denyRequest = async (friendshipId: number) => {
    const res = await fetch('/api/friends/deny', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId })
    })

    if (res.ok) {
      fetchRequests()
    }
  }

  if (loading) return <div>Loading...</div>

  if (requests.length === 0) {
    return <p className="text-gray-500">No pending requests</p>
  }

  return (
    <div className="space-y-4">
       <h2 className="text-xl font-bold">Friend Requests ({requests.length})</h2>
      {requests.map(request => (
        <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-semibold">{request.sender.username}</p>
            <p className="text-sm text-gray-500">@{request.sender.username}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => denyRequest(request.id)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Deny
            </button>
            <button
              onClick={() => acceptRequest(request.id)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}