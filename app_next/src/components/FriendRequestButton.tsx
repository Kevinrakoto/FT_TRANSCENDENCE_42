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

    return () => clearTimeout(timeout)
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

      <style>{`
        .frb-status {
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
        }

        .frb-success {
          color: #34d399;
        }

        .frb-error {
          color: #f87171;
        }

        .frb-friend {
          color: #60a5fa;
        }

        .frb-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .frb-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .frb-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .frb-dropdown {
          position: absolute;
          z-index: 50;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 6px;
          background: rgba(20, 20, 35, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .frb-suggestion {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: white;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .frb-suggestion:last-child {
          border-bottom: none;
        }

        .frb-suggestion:hover {
          background: rgba(59, 130, 246, 0.15);
        }

        .frb-suggestion-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
        }

        .frb-suggestion-info {
          flex: 1;
          min-width: 0;
        }

        .frb-suggestion-name {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .frb-suggestion-online {
          color: #10b981;
          font-size: 11px;
          font-weight: 600;
        }

        .frb-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        .frb-badge-friends {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .frb-badge-pending {
          background: rgba(250, 204, 21, 0.2);
          color: #fbbf24;
        }

        .frb-badge-add {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
      `}</style>
    </div>
  )
}
