'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import FriendRequestButton from '@/components/FriendRequestButton'
import PageLayout from '@/components/PageLayout'
import { chatSocket } from '@/lib/socket-client'
import { useChatNotifications } from '@/hooks/useChatNotifications'
import { useUserProfileCache } from '@/components/UserProfileProvider'

interface OnlinePlayer {
  userId: string
  username: string
}

interface Friend {
  id: number
  username: string
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
    tankColor: string
    avatar: string | null
  }
  createdAt: string
}

interface ActionFeedback {
  message: string
  type: 'success' | 'error'
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
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  const { notifications, unreadMessagesCount, refreshFriendRequests } = useChatNotifications()
  const { getProfile } = useUserProfileCache()
  const [friendsWithUpdates, setFriendsWithUpdates] = useState<Map<number, Friend>>(new Map())

  useEffect(() => {
    setFriendsWithUpdates(prev => {
      const newMap = new Map(prev)
      friends.forEach(friend => {
        const updated = getProfile(friend.id)
        if (updated) {
          newMap.set(friend.id, {
            ...friend,
            username: updated.username || friend.username,
            avatar: updated.avatar !== undefined ? updated.avatar : friend.avatar,
            tankColor: updated.tankColor || friend.tankColor,
          })
        }
      })
      return newMap
    })
  }, [friends, getProfile])

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }, [])

  const fetchFriends = useCallback(async () => {
    const res = await fetch('/api/friends/list')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setFriends(data)
    }
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

    Promise.all([fetchFriends(), fetchPendingRequests()]).finally(() => {
      setLoading(false)
    })

    const onOnlinePlayersUpdate = (players: OnlinePlayer[]) => {
      const onlineIds = new Set(players.map(p => Number(p.userId)))
      setOnlinePlayers(onlineIds)
      setFriends(prev => prev.map(friend => ({
        ...friend,
        isOnline: onlineIds.has(friend.id)
      })))
    }

    const onUserJoined = (data: { userId: number }) => {
      setOnlinePlayers(prev => new Set([...prev, data.userId]))
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? { ...friend, isOnline: true } : friend
      ))
    }

    const onUserLeft = (data: { userId: number }) => {
      setOnlinePlayers(prev => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? { ...friend, isOnline: false } : friend
      ))
    }

    const onProfileUpdated = (data: { userId: number; avatar?: string; tankColor?: string; username?: string }) => {
      setFriends(prev => prev.map(friend =>
        friend.id === data.userId ? {
          ...friend,
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.tankColor !== undefined && { tankColor: data.tankColor }),
          ...(data.username !== undefined && { username: data.username })
        } : friend
      ))
    }

    const onFriendNotification = (data: any) => {
      if (data.type === 'friend_request') {
        fetchPendingRequests()
        refreshFriendRequests()
      } else if (data.type === 'friend_accepted' || data.type === 'friend_denied' || data.type === 'friend_removed') {
        fetchFriends()
      }
    }

    const onFriendsListUpdated = () => {
      fetchFriends()
    }

    chatSocket.on('online-players-update', onOnlinePlayersUpdate)
    chatSocket.on('user-joined', onUserJoined)
    chatSocket.on('user-left', onUserLeft)
    chatSocket.on('user-profile-updated', onProfileUpdated)
    chatSocket.on('friend-notification', onFriendNotification)
    window.addEventListener('friends-list-updated', onFriendsListUpdated)

    const interval = setInterval(() => {
      chatSocket.emit('request-online-players', {})
    }, 5000)

    const handleFocus = () => {
      chatSocket.emit('request-online-players', {})
      fetchPendingRequests()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      chatSocket.off('online-players-update', onOnlinePlayersUpdate)
      chatSocket.off('user-joined', onUserJoined)
      chatSocket.off('user-left', onUserLeft)
      chatSocket.off('user-profile-updated', onProfileUpdated)
      chatSocket.off('friend-notification', onFriendNotification)
      window.removeEventListener('friends-list-updated', onFriendsListUpdated)
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session, fetchFriends, fetchPendingRequests, refreshFriendRequests])

  const removeFriend = async (friendId: number) => {
    setRemovingId(friendId)
    try {
      const res = await fetch(`/api/friends/delete?id=${friendId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFriends(prev => prev.filter(f => f.id !== friendId))
        showFeedback('Friend removed successfully', 'success')
      } else {
        const data = await res.json()
        showFeedback(data.error || 'Failed to remove friend', 'error')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      showFeedback('Network error', 'error')
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
        showFeedback('Friend request accepted! You are now friends.', 'success')
      } else {
        const data = await res.json()
        showFeedback(data.error || 'Failed to accept request', 'error')
      }
    } catch (error) {
      showFeedback('Network error', 'error')
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
        showFeedback('Friend request declined', 'success')
      } else {
        const data = await res.json()
        showFeedback(data.error || 'Failed to decline request', 'error')
      }
    } catch (error) {
      showFeedback('Network error', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Friends" backUrl="/home">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
          <div className="loading-text">LOADING...</div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Friends" backUrl="/home">
      {/* Action feedback banner */}
      {feedback && (
        <div className={`action-feedback ${feedback.type}`}>
          <span className="feedback-icon">{feedback.type === 'success' ? '✅' : '❌'}</span>
          <span>{feedback.message}</span>
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
                showFeedback('Friend request sent!', 'success')
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
            <span className="tab-icon">👥</span>
            Friends ({friends.length})
          </button>
          <button
            className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => { setActiveTab('requests'); fetchPendingRequests(); }}
          >
            <span className="tab-icon">📨</span>
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
                {friends.map(friend => {
                  const updatedFriend = friendsWithUpdates.get(friend.id) || friend
                  return (
                  <div key={friend.id} className="friend-card">
                    <div className="friend-avatar-container">
                      {updatedFriend.avatar ? (
                        <img src={updatedFriend.avatar} alt="Avatar" className="friend-avatar" />
                      ) : (
                        <div className="friend-avatar friend-avatar-placeholder" style={{ backgroundColor: updatedFriend.tankColor }}>
                          {updatedFriend.username?.charAt(0)}
                        </div>
                      )}
                      <div className={`online-indicator ${friend.isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="friend-info">
                      <Link href={`/profiles/${friend.id}`} className="friend-name">
                        {updatedFriend.username}
                      </Link>
                      <p className="friend-status">
                        {friend.isOnline ? (
                          <span className="status-online">● Online</span>
                        ) : (
                          <span className="status-offline">
                            Last seen {friend.lastSeen ? formatDate(friend.lastSeen) : 'unknown'}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="friend-actions">
                      {friend.conversationId && (
                        <Link
                          href={`/chat/${friend.id}?conversation=${friend.conversationId}`}
                          className="action-btn chat-btn"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          Chat
                        </Link>
                      )}
                      <Link href={`/profiles/${friend.id}`} className="action-btn profile-btn" title="View profile">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Profile
                      </Link>
                      <button
                        onClick={() => removeFriend(friend.id)}
                        disabled={removingId === friend.id}
                        className="action-btn remove-btn"
                        title="Remove friend"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {removingId === friend.id ? '...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">👥</p>
                <p className="empty-title">No friends yet</p>
                <p className="empty-desc">Search for players above to add them!</p>
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
                          {request.sender.username?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="friend-info">
                      <p className="friend-name">{request.sender.username}</p>
                      <p className="friend-status">@{request.sender.username} wants to be your friend</p>
                    </div>
                    <div className="request-actions">
                      <button
                        onClick={() => acceptRequest(request.id)}
                        disabled={processingId === request.id}
                        className="action-btn accept-btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {processingId === request.id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => denyRequest(request.id)}
                        disabled={processingId === request.id}
                        className="action-btn deny-btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {processingId === request.id ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">📨</p>
                <p className="empty-title">No pending requests</p>
                <p className="empty-desc">When someone sends you a friend request, it will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
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
