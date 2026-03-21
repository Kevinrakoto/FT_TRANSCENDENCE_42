// src/components/FriendRequestButton.tsx
'use client'

import { useState } from 'react'

interface Props {
  username: string
  onRequestSent?: () => void
}

export default function FriendRequestButton({ username, onRequestSent }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  const sendRequest = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      if (res.ok) {
        setStatus('sent')
        onRequestSent?.()
      } else {
        const data = await res.json()
        setStatus('error')
        alert(data.error)
      }
    } catch (error) {
      setStatus('error')
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'sent') {
    return <span className="text-green-600">✓ Request sent</span>
  }

  return (
    <button
      onClick={sendRequest}
      disabled={loading}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {loading ? 'Sending...' : 'Add friend'}
    </button>
  )
}