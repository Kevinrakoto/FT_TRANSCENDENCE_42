// src/hooks/useChatNotifications.tsx
'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { chatSocket } from '@/lib/socket-client'

export interface ChatNotification {
  id: string
  type: 'message' | 'friend_request' | 'friend_accepted' | 'friend_denied' | 'friend_removed'
  fromUserId: number
  fromUsername: string
  fromTankName?: string
  conversationId?: number
  friendshipId?: number
  message?: string
  timestamp: Date
  read: boolean
}

interface ChatNotificationsContextType {
  notifications: ChatNotification[]
  unreadCount: number
  unreadMessagesCount: number
  unreadFriendRequestsCount: number
  toast: ChatNotification | null
  dismissToast: () => void
  addNotification: (notification: Omit<ChatNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  refreshFriendRequests: () => Promise<void>
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | null>(null)

export function useChatNotifications() {
  const context = useContext(ChatNotificationsContext)
  if (!context) {
    throw new Error('useChatNotifications must be used within ChatNotificationsProvider')
  }
  return context
}

export function ChatNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [friendRequestsCount, setFriendRequestsCount] = useState(0)
  const [toast, setToast] = useState<ChatNotification | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentUserId = session?.user?.id ? Number(session.user.id) : undefined
  const currentUserIdRef = useRef(currentUserId)
  const isSessionLoaded = status !== 'loading'
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const showToast = useCallback((notification: ChatNotification) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(notification)
    toastTimerRef.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const refreshFriendRequests = useCallback(async () => {
    if (!currentUserIdRef.current) return
    try {
      const res = await fetch('/api/friends/pending')
      if (res.ok) {
        const data = await res.json()
        setFriendRequestsCount(data.length)
        
        setNotifications(prev => {
          const existingIds = new Set(prev.filter(n => n.type === 'friend_request').map(n => n.id))
          const newNotifications = data
            .filter((req: any) => !existingIds.has(`fr-${req.id}`))
            .map((req: any): ChatNotification => ({
              id: `fr-${req.id}`,
              type: 'friend_request',
              fromUserId: req.sender.id,
              fromUsername: req.sender.username,
              fromTankName: req.sender.tankName,
              friendshipId: req.id,
              timestamp: new Date(req.createdAt),
              read: false,
            }))
          return [...newNotifications, ...prev].slice(0, 50)
        })
      }
    } catch (error) {
      console.error('[ChatNotifications] Error fetching friend requests:', error)
    }
  }, [])

  useEffect(() => {
    if (!isSessionLoaded || !currentUserId) return
    
    refreshFriendRequests()
    
    const interval = setInterval(refreshFriendRequests, 10000)
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFriendRequests()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSessionLoaded, currentUserId, refreshFriendRequests])

  // Real-time friend notification listener
  useEffect(() => {
    if (!currentUserIdRef.current) return

    function onFriendNotification(data: any) {
      const userId = currentUserIdRef.current
      if (!userId) return

      if (data.type === 'friend_request') {
        const notification: ChatNotification = {
          id: `fr-realtime-${data.friendshipId || Date.now()}`,
          type: 'friend_request',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          friendshipId: data.friendshipId,
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev.filter(n => n.id !== notification.id)].slice(0, 50))
        setFriendRequestsCount(prev => prev + 1)
        showToast(notification)
        refreshFriendRequests()
      } else if (data.type === 'friend_accepted') {
        const notification: ChatNotification = {
          id: `fa-${data.fromUserId}-${Date.now()}`,
          type: 'friend_accepted',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          conversationId: data.conversationId,
          message: `${data.fromUsername || 'Someone'} accepted your friend request`,
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev].slice(0, 50))
        showToast(notification)
      } else if (data.type === 'friend_denied') {
        const notification: ChatNotification = {
          id: `fd-${data.fromUserId}-${Date.now()}`,
          type: 'friend_denied',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          message: `${data.fromUsername || 'Someone'} declined your friend request`,
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev].slice(0, 50))
        showToast(notification)
      } else if (data.type === 'friend_removed') {
        const notification: ChatNotification = {
          id: `fr-removed-${data.fromUserId}-${Date.now()}`,
          type: 'friend_removed',
          fromUserId: data.fromUserId,
          fromUsername: 'Someone',
          message: 'A user removed you from their friends list',
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev].slice(0, 50))
        showToast(notification)
      }
    }

    chatSocket.on('friend-notification', onFriendNotification)

    return () => {
      chatSocket.off('friend-notification', onFriendNotification)
    }
  }, [])

  useEffect(() => {
    if (!currentUserIdRef.current) return

    function onNewMessage(data: any) {
      const userId = currentUserIdRef.current
      if (!userId || data.userId === userId) return

      const notification: ChatNotification = {
        id: `msg-${data.id}-${Date.now()}`,
        type: 'message',
        fromUserId: data.userId,
        fromUsername: data.user?.username || 'Unknown',
        fromTankName: data.user?.tankName,
        conversationId: data.conversationId,
        message: data.content,
        timestamp: new Date(),
        read: false,
      }

      setNotifications(prev => [notification, ...prev].slice(0, 50))
    }

    chatSocket.on('new-message', onNewMessage)

    return () => {
      chatSocket.off('new-message', onNewMessage)
    }
  }, [])

  const addNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: ChatNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 50))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadMessagesCount = notifications.filter(n => !n.read && n.type === 'message').length
  const unreadFriendRequestsCount = friendRequestsCount
  const unreadCount = unreadMessagesCount + unreadFriendRequestsCount

  return (
    <ChatNotificationsContext.Provider value={{
      notifications,
      unreadCount,
      unreadMessagesCount,
      unreadFriendRequestsCount,
      toast,
      dismissToast,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      refreshFriendRequests,
    }}>
      {children}
    </ChatNotificationsContext.Provider>
  )
}
