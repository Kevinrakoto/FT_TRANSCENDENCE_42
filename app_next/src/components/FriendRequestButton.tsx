// src/components/FriendRequestButton.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

interface SuggestedUser {
  id: number
  username: string
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
  const [errorMsg, setErrorMsg] = useState('')
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

    if (!username || username.length < 2) {
      setSuggestions([])
      setStatus('idle')
      setErrorMsg('')
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(username)}`)
        const data = await res.json()
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
    setErrorMsg('')
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: target })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setStatus('sent')
        onRequestSent?.()
        setSuggestions(prev => prev.map(s => 
          s.username === target ? { ...s, friendshipStatus: 'pending' } : s
        ))
        setTimeout(() => {
          setStatus('idle')
          setSuggestions(prev => prev.map(s => 
            s.username === target ? { ...s, friendshipStatus: 'none' } : s
          ))
        }, 3000)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to send request')
      }
    } catch (error) {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
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

  return (
    <div ref={containerRef} className="relative">
      {status === 'sent' && (
        <span className="frb-status frb-success">Request sent!</span>
      )}
      {status === 'error' && errorMsg && (
        <span className="frb-status frb-error">{errorMsg}</span>
      )}
      {isFriend && (
        <span className="frb-status frb-friend">Already friends</span>
      )}
      <button
        onClick={() => sendRequest()}
        disabled={loading || !!isFriend || !username.trim()}
        className="frb-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
        </svg>
        {loading ? 'Sending...' : 'Add Friend'}
      </button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="frb-dropdown">
          {suggestions.map(user => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="frb-suggestion"
            >
              <div 
                className="frb-suggestion-avatar"
                style={{ backgroundColor: user.tankColor || '#666' }}
              >
                {user.username.charAt(0)}
              </div>
              <div className="frb-suggestion-info">
                <p className="frb-suggestion-name">{user.username}</p>
                {user.isOnline && <span className="frb-suggestion-online">● Online</span>}
              </div>
              {user.friendshipStatus === 'friends' && (
                <span className="frb-badge frb-badge-friends">Friends</span>
              )}
              {user.friendshipStatus === 'pending' && (
                <span className="frb-badge frb-badge-pending">Pending</span>
              )}
              {user.friendshipStatus === 'none' && (
                <span className="frb-badge frb-badge-add">+ Add</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
