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
    try {
      const res = await fetch('/api/friends/list')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setFriends(data)
      }
    } catch (error) {
    }
    chatSocket.emit('request-online-players', {})
  }, [])

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/pending')
      if (res.ok) {
        const data = await res.json()
        setPendingRequests(data)
      }
    } catch (error) {
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
      // Don't add duplicate - ChatNotificationsProvider already handles this via window events
      // This is just for refreshing data
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

      <style>{`
        .action-feedback {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          margin: 0 0 20px 0;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          animation: slideDown 0.3s ease;
        }

        .action-feedback.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .action-feedback.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .feedback-icon {
          font-size: 18px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .friend-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .friend-toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(30, 30, 50, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          min-width: 300px;
        }

        .friend-toast-icon {
          font-size: 24px;
        }

        .friend-toast-title {
          color: white;
          font-weight: 700;
          font-size: 14px;
        }

        .friend-toast-message {
          color: #9ca3af;
          font-size: 12px;
          margin-top: 2px;
        }

        .friend-toast-close {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
        }

        .friend-toast-close:hover {
          color: white;
        }

        .section-title {
          color: #8b8b8b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .add-friend-row {
          display: flex;
          gap: 10px;
        }

        .add-friend-input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(20, 20, 35, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .add-friend-input:focus {
          border-color: #3b82f6;
        }

        .add-friend-input::placeholder {
          color: #6b7280;
        }

        .friends-tabs {
          display: flex;
          gap: 8px;
          margin: 24px 0 20px;
        }

        .friends-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(30, 30, 50, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #8b8b8b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .friends-tab:hover {
          background: rgba(50, 50, 70, 0.8);
          color: white;
        }

        .friends-tab.active {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
        }

        .friends-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .friend-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: rgba(20, 20, 35, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .friend-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(30, 30, 50, 0.9);
        }

        .friend-avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .friend-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .friend-avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
        }

        .online-indicator {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 3px solid #141420;
        }

        .online-indicator.online {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .online-indicator.offline {
          background: #6b7280;
        }

        .friend-info {
          flex: 1;
          min-width: 0;
        }

        .friend-name {
          color: white;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          display: block;
          transition: color 0.2s;
        }

        .friend-name:hover {
          color: #60a5fa;
        }

        .friend-status {
          font-size: 12px;
          margin-top: 3px;
        }

        .status-online {
          color: #10b981;
          font-weight: 600;
        }

        .status-offline {
          color: #6b7280;
        }

        .friend-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .request-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .chat-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .chat-btn:hover {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }

        .profile-btn {
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.4);
          color: #a78bfa;
        }

        .profile-btn:hover {
          background: rgba(139, 92, 246, 0.3);
          color: #c4b5fd;
        }

        .remove-btn {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .remove-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .accept-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-size: 13px;
          padding: 10px 20px;
        }

        .accept-btn:hover {
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .accept-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .deny-btn {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          font-size: 13px;
          padding: 10px 20px;
        }

        .deny-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .deny-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .request-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: rgba(20, 20, 35, 0.9);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .request-card:hover {
          border-color: rgba(59, 130, 246, 0.4);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-title {
          color: #9ca3af;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .empty-desc {
          font-size: 13px;
          color: #6b7280;
        }
      `}</style>
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
