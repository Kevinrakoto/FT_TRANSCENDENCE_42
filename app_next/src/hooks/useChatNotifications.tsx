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
  activityCount: number
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
      const res = await fetch('/api/friends/pending', {
        cache: 'no-store',
      })
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

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends/list')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          window.dispatchEvent(new CustomEvent('friends-list-updated', { detail: data }))
        }
      }
    } catch (error) {
      console.error('[ChatNotifications] Error fetching friends:', error)
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

  const markAsRead = useCallback(async (id: string) => {
    // Remove from the notifications list when marked as read
    setNotifications(prev => prev.filter(n => n.id !== id))
    
    const numericId = id.replace(/^[a-z]+-/, '').split('-')[0]
    if (!isNaN(Number(numericId))) {
      try {
        await fetch('/api/me/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [Number(numericId)] }),
        })
      } catch (error) {
        console.error('[ChatNotifications] Error marking as read:', error)
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await fetch('/api/me/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
    } catch (error) {
      console.error('[ChatNotifications] Error marking all as read:', error)
    }
  }, [])

  const removeNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const numericId = id.replace(/^[a-z]+-/, '').split('-')[0]
    if (!isNaN(Number(numericId))) {
      try {
        await fetch('/api/me/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: Number(numericId) }),
        })
      } catch (error) {
        console.error('[ChatNotifications] Error deleting notification:', error)
      }
    }
  }, [])

  const clearAll = useCallback(async () => {
    setNotifications([])
    try {
      await fetch('/api/me/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      })
    } catch (error) {
      console.error('[ChatNotifications] Error clearing all notifications:', error)
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

  useEffect(() => {
    if (!currentUserId) return

    const handleFriendNotification = (e: CustomEvent) => {
      const data = e.detail
      if (!currentUserIdRef.current) return

      if (data.type === 'friend_request') {
        // Use both fromUserId and timestamp for unique ID to avoid duplicates
        const notificationId = `fr-${data.fromUserId}-${data.friendshipId || Date.now()}`
        const existing = notifications.find(n => n.id === notificationId)
        if (existing) return // Already showing
        
        const notification: ChatNotification = {
          id: notificationId,
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
        const notificationId = `fa-${data.fromUserId}`
        const existing = notifications.find(n => n.id === notificationId)
        if (existing) return // Already showing
        
        const notification: ChatNotification = {
          id: notificationId,
          type: 'friend_accepted',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          conversationId: data.conversationId,
          message: `${data.fromUsername || 'Someone'} accepted your friend request`,
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev.slice(0, 50)])
        showToast(notification)
        fetchFriends()
      } else if (data.type === 'friend_denied') {
        const notificationId = `fd-${data.fromUserId}`
        const existing = notifications.find(n => n.id === notificationId)
        if (existing) return
        
        const notification: ChatNotification = {
          id: notificationId,
          type: 'friend_denied',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          message: `${data.fromUsername || 'Someone'} declined your friend request`,
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev.slice(0, 50)])
        showToast(notification)
      } else if (data.type === 'friend_removed') {
        const notificationId = `frr-${data.fromUserId}`
        const existing = notifications.find(n => n.id === notificationId)
        if (existing) return
        
        const notification: ChatNotification = {
          id: notificationId,
          type: 'friend_removed',
          fromUserId: data.fromUserId,
          fromUsername: 'Someone',
          message: 'A user removed you from their friends list',
          timestamp: new Date(),
          read: false,
        }
        setNotifications(prev => [notification, ...prev.slice(0, 50)])
        showToast(notification)
        fetchFriends()
      }
    }

    const handleNewMessage = (e: CustomEvent) => {
      const data = e.detail
      const currentId = currentUserIdRef.current
      
      // Skip if no user or message from self
      if (!currentId) {
        return
      }
      if (!data?.userId) {
        return
      }
      if (Number(data.userId) === currentId) {
        return
      }
      
      // Use unique ID based on message data to avoid duplicates
      const notificationId = `msg-${data.id}`
      const existing = notifications.find(n => n.id === notificationId)
      if (existing) {
        return
      }
      
      const notification: ChatNotification = {
        id: notificationId,
        type: 'message',
        fromUserId: data.userId,
        fromUsername: data.user?.username || 'Unknown',
        conversationId: data.conversationId,
        message: data.content,
        timestamp: new Date(),
        read: false,
      }

      setNotifications(prev => {
        const updated = [notification, ...prev.slice(0, 50)]
        return updated
      })
      
      showToast(notification)
    }

    window.addEventListener('friend-notification', handleFriendNotification as EventListener)
    window.addEventListener('new-message', handleNewMessage as EventListener)

    return () => {
      window.removeEventListener('friend-notification', handleFriendNotification as EventListener)
      window.removeEventListener('new-message', handleNewMessage as EventListener)
    }
  }, [currentUserId, refreshFriendRequests, notifications])

  const unreadMessagesCount = notifications.filter(n => !n.read && n.type === 'message').length
  const unreadFriendRequestsCount = friendRequestsCount
  const activityCount = notifications.filter(n => 
    ['friend_accepted', 'friend_denied', 'friend_removed'].includes(n.type)
  ).length
  const unreadCount = unreadMessagesCount + unreadFriendRequestsCount + activityCount

  return (
    <ChatNotificationsContext.Provider value={{
      notifications,
      unreadCount,
      unreadMessagesCount,
      unreadFriendRequestsCount,
      activityCount,
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