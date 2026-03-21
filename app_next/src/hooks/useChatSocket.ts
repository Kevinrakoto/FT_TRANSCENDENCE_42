// src/hooks/useChatSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react'
import { chatSocket, getSocket } from '@/lib/socket-client'
import { Message, User } from '@/types/chat'

interface UseChatSocketProps {
  conversationId: number
  currentUser: User
  otherUserId?: number
  otherUserInitialOnline?: boolean
}

export function useChatSocket({ conversationId, currentUser, otherUserId, otherUserInitialOnline }: UseChatSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const [otherUserOnline, setOtherUserOnline] = useState<boolean>(otherUserInitialOnline ?? false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(false)
  const conversationIdRef = useRef(conversationId)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (otherUserInitialOnline !== undefined) {
      setOtherUserOnline(otherUserInitialOnline)
    }
  }, [otherUserInitialOnline])

  useEffect(() => {
    const userIdStr = String(currentUser.id)
    const userIdNum = currentUser.id

    const socket = getSocket()
    
    const handleConnect = () => {
      console.log('[Chat] Socket connected, joining room:', conversationIdRef.current)
      socket.emit('join-private-room', { conversationId: String(conversationIdRef.current), userId: userIdStr })
      socket.emit('request-online-players', {})
      setIsConnected(true)
    }

    if (!isConnectedRef.current) {
      chatSocket.connect(userIdStr, currentUser.username, currentUser.tankName)
      isConnectedRef.current = true
      
      if (socket.connected) {
        handleConnect()
      } else {
        socket.once('connect', handleConnect)
      }
    }

    function onNewMessage(message: Message) {
      if (message.conversationId === conversationIdRef.current) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
        setIsOtherTyping(false)
      }
    }

    function onOnlinePlayersUpdate(players: { userId: string | number }[]) {
      const userIds = new Set(players.map(p => Number(p.userId)).filter(id => id !== userIdNum))
      setOnlineUsers(userIds)
      if (otherUserId) {
        setOtherUserOnline(userIds.has(otherUserId))
      }
    }

    function onUserJoined(data: { userId: number | string }) {
      const joinedUserId = Number(data.userId)
      if (joinedUserId !== userIdNum) {
        setOnlineUsers(prev => new Set([...prev, joinedUserId]))
        if (otherUserId && joinedUserId === otherUserId) {
          setOtherUserOnline(true)
        }
      }
      getSocket().emit('request-online-players', {})
    }

    function onUserLeft(data: { userId: number | string }) {
      const leftUserId = Number(data.userId)
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(leftUserId)
        return next
      })
      if (otherUserId && leftUserId === otherUserId) {
        setOtherUserOnline(false)
      }
    }

    function onUserTyping(data: { userId: number | string; isTyping: boolean }) {
      if (Number(data.userId) !== userIdNum) {
        setIsOtherTyping(data.isTyping)
        if (data.isTyping && typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false)
          }, 3000)
        }
      }
    }

    chatSocket.on('new-message', onNewMessage)
    chatSocket.on('user-joined', onUserJoined)
    chatSocket.on('user-left', onUserLeft)
    chatSocket.on('online-players-update', onOnlinePlayersUpdate)
    chatSocket.on('user-typing', onUserTyping)

    chatSocket.on('user-profile-updated', (data: { userId: number; avatar?: string; tankName?: string; tankColor?: string; username?: string }) => {
      console.log('[Chat] Profile updated:', data)
    })

    return () => {
      chatSocket.emit('leave-private-room', { conversationId: String(conversationIdRef.current) })
      chatSocket.off('new-message', onNewMessage)
      chatSocket.off('user-joined', onUserJoined)
      chatSocket.off('user-left', onUserLeft)
      chatSocket.off('online-players-update', onOnlinePlayersUpdate)
      chatSocket.off('user-typing', onUserTyping)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, currentUser.id, otherUserId, otherUserInitialOnline, currentUser.username, currentUser.tankName])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return
    console.log('[Chat] Sending message:', { conversationId, content, userId: currentUser.id })
    chatSocket.sendPrivateMessage(String(conversationId), content, String(currentUser.id))
  }, [conversationId, currentUser.id])

  const startTyping = useCallback(() => {
    chatSocket.sendTyping(String(conversationId), String(currentUser.id), true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.sendTyping(String(conversationId), String(currentUser.id), false)
    }, 2000)
  }, [conversationId, currentUser.id])

  return {
    isConnected,
    messages,
    setMessages,
    isOtherTyping,
    onlineUsers: Array.from(onlineUsers),
    otherUserOnline,
    sendMessage,
    startTyping,
  }
}
