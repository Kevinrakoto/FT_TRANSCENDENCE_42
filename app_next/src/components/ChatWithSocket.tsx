// src/hooks/useChatSocket.tsx
import { useEffect, useState, useCallback } from 'react'
import { getSocket } from '@/lib/socket-client'
import { Message, User } from '@/types/chat'

interface UseChatSocketProps {
  conversationId: number
  currentUser: User
}

export function useChatSocket({ conversationId, currentUser }: UseChatSocketProps) {
  const socket = getSocket()
  const [isConnected, setIsConnected] = useState(socket.connected) 
  const [messages, setMessages] = useState<Message[]>([])
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<number[]>([])

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
      socket.emit('authenticate', currentUser.id)
      socket.emit('join-private-room', { conversationId, userId: currentUser.id })
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    function onNewMessage(message: Message) {
      setMessages(prev => [...prev, message])
    }

    function onUserJoined({ userId }: { userId: number }) {
      setOnlineUsers(prev => [...prev, userId])
    }

    function onUserLeft({ userId }: { userId: number }) {
      setOnlineUsers(prev => prev.filter(id => id !== userId))
    }

    function onOnlinePlayersUpdate(players: { userId: number }[]) {
      setOnlineUsers(players.map(p => Number(p.userId)))
    }

    function onUserTyping({ userId, isTyping }: { userId: number; isTyping: boolean }) {
      if (userId !== currentUser.id) {
        setIsOtherTyping(isTyping)
      }
    }

    if (socket.connected) {
      socket.emit('authenticate', currentUser.id)
      socket.emit('join-private-room', { conversationId, userId: currentUser.id })
    } else {
      socket.connect()
    }

    function onRoomParticipants(userIds: number[]) {
      setOnlineUsers(userIds);
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('new-message', onNewMessage)
    socket.on('user-joined', onUserJoined)
    socket.on('user-left', onUserLeft)
    socket.on('user-typing', onUserTyping)
    socket.on('online-players-update', onOnlinePlayersUpdate)
    socket.on('room-participants', onRoomParticipants);

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('new-message', onNewMessage)
      socket.off('user-joined', onUserJoined)
      socket.off('user-left', onUserLeft)
      socket.off('user-typing', onUserTyping)
      socket.off('online-players-update', onOnlinePlayersUpdate)
      socket.emit('leave-private-room', { conversationId })
    }
  }, [conversationId, currentUser.id, socket])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return
    socket.emit('private-message', {
      conversationId,
      content,
      userId: currentUser.id,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        tankColor: currentUser.tankColor
      }
    })
  }, [conversationId, currentUser, socket])

  const startTyping = useCallback(() => {
    socket.emit('typing', { conversationId, isTyping: true })
    setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false })
    }, 2000)
  }, [conversationId, socket])

  return {
    isConnected,
    messages,
    setMessages,
    isOtherTyping,
    onlineUsers,
    sendMessage,
    startTyping
  }
}