// src/components/FriendRequestButton.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

interface SuggestedUser {
  id: number
  username: string
  tankName: string
  tankColor: string
  avatar: string | null
  isOnline: boolean
  friendshipStatus: 'none' | 'pending' | 'friends'
}

interface Props {
  username: string
  onRequestSent?: () => void
  onUserSelect?: (user: SuggestedUser) => void
}

export default function FriendRequestButton({ username, onRequestSent, onUserSelect }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    console.log('Search username:', username)

    if (!username || username.length < 2) {
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      console.log('Fetching search for:', username)
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(username)}`)
        const data = await res.json()
        console.log('Search results:', data)
        if (Array.isArray(data)) {
          setSuggestions(data)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
      }
    }, 300)

    setSearchTimeout(timeout)
  }, [username])

  const sendRequest = async (targetUsername?: string) => {
    const target = targetUsername || username
    if (!target) return

    setLoading(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: target })
      })
      
      if (res.ok) {
        setStatus('sent')
        onRequestSent?.()
        setSuggestions(prev => prev.map(s => 
          s.username === target ? { ...s, friendshipStatus: 'pending' } : s
        ))
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

  const handleSelectUser = (user: SuggestedUser) => {
    onUserSelect?.(user)
    if (user.friendshipStatus === 'none') {
      sendRequest(user.username)
    }
    setShowSuggestions(false)
  }

  const pendingRequest = Array.isArray(suggestions) && suggestions.find(s => s.username === username && s.friendshipStatus === 'pending')
  const isFriend = Array.isArray(suggestions) && suggestions.find(s => s.username === username && s.friendshipStatus === 'friends')

  if (status === 'sent' || pendingRequest) {
    return <span className="text-green-500 font-semibold">Request sent</span>
  }

  return (
    <div ref={containerRef} className="relative">
      {isFriend && (
        <span className="text-blue-500 font-semibold mr-2">Already friends</span>
      )}
      <button
        onClick={() => sendRequest()}
        disabled={loading || !!isFriend}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Add friend'}
      </button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-3"
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: user.tankColor || '#666' }}
              >
                {user.tankName?.charAt(0) || user.username.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{user.tankName || user.username}</p>
                <p className="text-gray-400 text-xs">@{user.username}</p>
              </div>
              {user.friendshipStatus === 'friends' && (
                <span className="text-blue-400 text-xs">Friends</span>
              )}
              {user.friendshipStatus === 'pending' && (
                <span className="text-yellow-400 text-xs">Pending</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
