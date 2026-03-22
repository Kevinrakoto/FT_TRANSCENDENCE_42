// src/hooks/useChatNotifications.tsx
'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { chatSocket } from '@/lib/socket-client'

export interface ChatNotification {
  id: string
  type: 'message' | 'friend_request'
  fromUserId: number
  fromUsername: string
  fromTankName?: string
  conversationId?: number
  message?: string
  timestamp: Date
  read: boolean
}

interface ChatNotificationsContextType {
  notifications: ChatNotification[]
  unreadCount: number
  unreadMessagesCount: number
  unreadFriendRequestsCount: number
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

export function ChatNotificationsProvider({ children, currentUserId }: { children: React.ReactNode; currentUserId?: number }) {
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [friendRequestsCount, setFriendRequestsCount] = useState(0)
  const currentUserIdRef = useRef(currentUserId)
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const refreshFriendRequests = useCallback(async () => {
    if (!currentUserIdRef.current) return
    try {
      const res = await fetch('/api/friends/pending')
      if (res.ok) {
        const data = await res.json()
        setFriendRequestsCount(data.length)
        
        data.forEach((req: any) => {
          const exists = notifications.some(n => n.type === 'friend_request' && n.fromUserId === req.sender.id)
          if (!exists) {
            const notification: ChatNotification = {
              id: `fr-${req.id}`,
              type: 'friend_request',
              fromUserId: req.sender.id,
              fromUsername: req.sender.username,
              fromTankName: req.sender.tankName,
              timestamp: new Date(req.createdAt),
              read: false,
            }
            setNotifications(prev => [notification, ...prev].slice(0, 50))
          }
        })
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }, [notifications])

  useEffect(() => {
    refreshFriendRequests()
    
    const interval = setInterval(refreshFriendRequests, 30000)
    return () => clearInterval(interval)
  }, [refreshFriendRequests])

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
