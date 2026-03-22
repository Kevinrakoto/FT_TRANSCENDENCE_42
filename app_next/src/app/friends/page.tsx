// src/app/friends/page.tsx
'use client'

import { useState, useEffect } from 'react'
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

export default function FriendsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [friends, setFriends] = useState<Friend[]>([])
  const [onlinePlayers, setOnlinePlayers] = useState<Set<number>>(new Set())
  const [searchUsername, setSearchUsername] = useState('')
  const { notifications, unreadMessagesCount } = useChatNotifications()

  useEffect(() => {
    if (!session?.user) return

    updateOnlineStatus(true)
    fetchFriends()
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

    const interval = setInterval(() => {
      chatSocket.emit('request-online-players', {})
    }, 5000)

    const handleFocus = () => {
      chatSocket.emit('request-online-players', {})
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      updateOnlineStatus(false)
      chatSocket.disconnect()
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session])

  const updateOnlineStatus = async (isOnline: boolean) => {
    try {
      await fetch('/api/me/online', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline })
      })
    } catch (error) {
      console.error('Error updating online status:', error)
    }
  }

  const fetchFriends = async () => {
    const res = await fetch('/api/friends/list')
    const data = await res.json()
    
    const friendsWithUnread = data.map((friend: Friend) => {
      const unreadFromFriend = notifications.filter(
        n => n.type === 'message' && n.fromUserId === friend.id && !n.read
      ).length
      return { ...friend, unreadCount: unreadFromFriend }
    })
    
    setFriends(friendsWithUnread)
    chatSocket.emit('request-online-players', {})
  }

  useEffect(() => {
    fetchFriends()
  }, [notifications])

  return (
    <PageLayout title="Friends" backUrl="/home">
      <div className="friends-container">
        <div className="add-friend-section">
          <h2 className="section-title">Add Friend</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="Enter username"
              className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <FriendRequestButton 
              username={searchUsername}
              onRequestSent={() => {
                setSearchUsername('')
              }}
            />
          </div>
        </div>

        <div className="friends-list-section">
          <h2 className="section-title">My Friends ({friends.length})</h2>
          
          {friends.length > 0 ? (
            <div className="friends-grid">
              {friends.map(friend => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-avatar-container">
                    {friend.avatar ? (
                      <img 
                        src={friend.avatar} 
                        alt="Avatar"
                        className="friend-avatar"
                      />
                    ) : (
                      <div 
                        className="friend-avatar friend-avatar-placeholder"
                        style={{ backgroundColor: friend.tankColor }}
                      >
                        {friend.tankName?.charAt(0) || friend.username?.charAt(0)}
                      </div>
                    )}
                    <div 
                      className={`online-indicator ${friend.isOnline ? 'online' : 'offline'}`}
                    />
                  </div>
                  
                  <div className="friend-info">
                    <h3 className="friend-name">{friend.tankName || friend.username}</h3>
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
                  
                  {friend.conversationId && (
                    <Link 
                      href={`/chat/${friend.id}?conversation=${friend.conversationId}`}
                      className={`chat-button ${friend.unreadCount && friend.unreadCount > 0 ? 'has-unread' : ''}`}
                    >
                      {friend.unreadCount && friend.unreadCount > 0 && (
                        <span className="unread-badge">{friend.unreadCount}</span>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      Chat
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>You don't have any friends yet.</p>
              <p className="text-sm text-gray-400 mt-2">Add players to start chatting!</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .friends-container {
          width: 100%;
        }

        .add-friend-section {
          background: rgba(30, 30, 40, 0.8);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-title {
          color: #8b8b8b;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          margin-bottom: 16px;
        }

        .friends-list-section {
          background: rgba(30, 30, 40, 0.8);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .friends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .friend-card {
          background: rgba(20, 20, 30, 0.9);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .friend-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
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
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #1a1a24;
        }

        .online-indicator.online {
          background: #10b981;
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
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .friend-status {
          font-size: 12px;
        }

        .status-online {
          color: #10b981;
        }

        .status-offline {
          color: #6b7280;
        }

        .chat-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          flex-shrink: 0;
          position: relative;
        }

        .chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .chat-button.has-unread {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .unread-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
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
