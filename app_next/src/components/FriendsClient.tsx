'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import FriendRequestButton from '@/components/FriendRequestButton'
import PageLayout from '@/components/PageLayout'
import { chatSocket } from '@/lib/socket-client'
import { useChatNotifications } from '@/hooks/useChatNotifications'

interface OnlinePlayer {
  userId: string
  username: string
  tankName: string
}

interface Friend {
  id: number
  username: string
  tankName: string
  tankColor: string
  avatar: string | null
  isOnline: boolean
  lastSeen: Date | null
  conversationId?: number
  unreadCount?: number
}

interface PendingRequest {
  id: number
  sender: {
    id: number
    username: string
    tankName: string
    tankColor: string
    avatar: string | null
  }
  createdAt: string
}

export default function FriendsClient() {
  const router = useRouter()
  const { data: session } = useSession()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [onlinePlayers, setOnlinePlayers] = useState<Set<number>>(new Set())
  const [searchUsername, setSearchUsername] = useState('')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const { notifications, unreadMessagesCount, refreshFriendRequests, toast, dismissToast } = useChatNotifications()

  const fetchFriends = useCallback(async () => {
    const res = await fetch('/api/friends/list')
    const data = await res.json()
    setFriends(data)
    chatSocket.emit('request-online-players', {})
  }, [])

  const fetchPendingRequests = useCallback(async () => {
    const res = await fetch('/api/friends/pending')
    if (res.ok) {
      const data = await res.json()
      setPendingRequests(data)
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return

    fetchFriends()
    fetchPendingRequests()
    chatSocket.connect(String(session.user.id), session.user.username, session.user.tankName)

    chatSocket.on('online-players-update', (players: OnlinePlayer[]) => {
      const onlineIds = new Set(players.map(p => Number(p.userId)))
      setOnlinePlayers(onlineIds)
      setFriends(prev => prev.map(friend => ({
        ...friend,
        isOnline: onlineIds.has(friend.id)
      })))
    })

    chatSocket.on('user-joined', (data: { userId: number }) => {
      setOnlinePlayers(prev => new Set([...prev, data.userId]))
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? { ...friend, isOnline: true } : friend
      ))
    })

    chatSocket.on('user-left', (data: { userId: number }) => {
      setOnlinePlayers(prev => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? { ...friend, isOnline: false } : friend
      ))
    })

    chatSocket.on('user-profile-updated', (data: { userId: number; avatar?: string; tankName?: string; tankColor?: string; username?: string }) => {
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? {
          ...friend,
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.tankName !== undefined && { tankName: data.tankName }),
          ...(data.tankColor !== undefined && { tankColor: data.tankColor }),
          ...(data.username !== undefined && { username: data.username })
        } : friend
      ))
    })

    // Real-time friend notifications
    chatSocket.on('friend-notification', (data: any) => {
      if (data.type === 'friend_request') {
        fetchPendingRequests()
        refreshFriendRequests()
      } else if (data.type === 'friend_accepted' || data.type === 'friend_denied' || data.type === 'friend_removed') {
        fetchFriends()
      }
    })

    const interval = setInterval(() => {
      chatSocket.emit('request-online-players', {})
    }, 5000)

    const handleFocus = () => {
      chatSocket.emit('request-online-players', {})
      fetchPendingRequests()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      chatSocket.disconnect()
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session, fetchFriends, fetchPendingRequests, refreshFriendRequests])

  const removeFriend = async (friendId: number) => {
    if (!confirm('Are you sure you want to remove this friend?')) return

    setRemovingId(friendId)
    try {
      const res = await fetch(`/api/friends/delete?id=${friendId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFriends(prev => prev.filter(f => f.id !== friendId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      alert('Network error')
    } finally {
      setRemovingId(null)
    }
  }

  const acceptRequest = async (friendshipId: number) => {
    setProcessingId(friendshipId)
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
        refreshFriendRequests()
        fetchFriends()
      }
    } finally {
      setProcessingId(null)
    }
  }

  const denyRequest = async (friendshipId: number) => {
    setProcessingId(friendshipId)
    try {
      const res = await fetch('/api/friends/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
        refreshFriendRequests()
      }
    } finally {
      setProcessingId(null)
    }
  }
  return (
    <PageLayout title="Friends" backUrl="/home">
      {/* Toast notification */}
      {toast && (
        <div className="friend-toast" onClick={dismissToast}>
          <div className="friend-toast-content">
            <span className="friend-toast-icon">
             {toast.type === 'friend_request' && '👤'}
              {toast.type === 'friend_accepted' && '✅'}
              {toast.type === 'friend_denied' && '❌'}
              {toast.type === 'friend_removed' && '🚫'}
            </span>
            <div>
              <p className="friend-toast-title">
                {toast.type === 'friend_request' && 'New Friend Request'}
                {toast.type === 'friend_accepted' && 'Friend Request Accepted'}
                {toast.type === 'friend_denied' && 'Friend Request Declined'}
                {toast.type === 'friend_removed' && 'Friend Removed'}
              </p>
              <p className="friend-toast-message">
                {toast.message || `${toast.fromUsername} sent you a friend request`}
              </p>
            </div>
            <button className="friend-toast-close" onClick={(e) => { e.stopPropagation(); dismissToast(); }}>&times;</button>
          </div>
        </div>
      )}

      <div className="friends-container">
        {/* Add Friend Section */}
        <div className="add-friend-section">
          <h2 className="section-title">ADD FRIEND</h2>
          <div className="add-friend-row">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="Enter username to search..."
              className="add-friend-input"
            />
            <FriendRequestButton
              username={searchUsername}
              onRequestSent={() => {
                setSearchUsername('')
              }}
              onUserSelect={(user) => setSearchUsername(user.username)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="friends-tabs">
          <button
            className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => { setActiveTab('requests'); fetchPendingRequests(); }}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="tab-badge">{pendingRequests.length}</span>
            )}
          </button>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="friends-list-section">
            {friends.length > 0 ? (
              <div className="friends-grid">
                {friends.map(friend => (
                  <div key={friend.id} className="friend-card">
                    <div className="friend-avatar-container">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="Avatar" className="friend-avatar" />
                      ) : (
                        <div className="friend-avatar friend-avatar-placeholder" style={{ backgroundColor: friend.tankColor }}>
                          {friend.tankName?.charAt(0) || friend.username?.charAt(0)}
                        </div>
                      )}
                      <div className={`online-indicator ${friend.isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="friend-info">
                      <Link href={`/profiles/${friend.id}`} className="friend-name">
                        {friend.tankName || friend.username}
                      </Link>
                      <p className="friend-status">
                        {friend.isOnline ? (
                          <span className="status-online">Online</span>
                        ) : (
                          <span className="status-offline">
                            Last seen {friend.lastSeen ? formatDate(friend.lastSeen) : 'unknown'}
                          </span>
                        )}
                      </p>
                    </div>

                    {friend.conversationId && (
                      <Link
                        href={`/chat/${friend.id}?conversation=${friend.conversationId}`}
                        className={`chat-button`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Chat
                      </Link>
                    )}
                    <Link href={`/profiles/${friend.id}`} className="profile-link-button" title="View profile">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      disabled={removingId === friend.id}
                      className="remove-button"
                      title="Remove friend"
                    >
                      {removingId === friend.id ? '...' : '\u2715'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">{"\u{1F465}"}</p>
                <p>No friends yet</p>
                <p className="text-sm text-gray-400 mt-2">Search for players above to add them!</p>
              </div>
            )}
          </div>
        )}

        {/* Friend Requests */}
        {activeTab === 'requests' && (
          <div className="friends-list-section">
            {pendingRequests.length > 0 ? (
              <div className="requests-list">
                {pendingRequests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="friend-avatar-container">
                      {request.sender.avatar ? (
                        <img src={request.sender.avatar} alt="Avatar" className="friend-avatar" />
                      ) : (
                        <div className="friend-avatar friend-avatar-placeholder" style={{ backgroundColor: request.sender.tankColor }}>
                          {request.sender.tankName?.charAt(0) || request.sender.username?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="friend-info">
                      <p className="friend-name">
                        {request.sender.tankName || request.sender.username}
                      </p>
                      <p className="friend-status">@{request.sender.username}</p>
                    </div>
                    <div className="request-actions">
                      <button
                        onClick={() => denyRequest(request.id)}
                        disabled={processingId === request.id}
                        className="deny-button"
                      >
                        {processingId === request.id ? '...' : 'Decline'}
                      </button>
                      <button
                        onClick={() => acceptRequest(request.id)}
                        disabled={processingId === request.id}
                        className="accept-button"
                      >
                        {processingId === request.id ? '...' : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">{"\u{1F4E8}"}</p>
                <p>No pending requests</p>
                <p className="text-sm text-gray-400 mt-2">When someone sends you a friend request, it will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </PageLayout>
  );
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString()
}
