// src/components/PrivateChat.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useChatSocket } from '@/hooks/useChatSocket'
import { chatSocket } from '@/lib/socket-client'
import { User, Message } from '@/types/chat'
import { useUserProfileCache } from '@/components/UserProfileProvider'

interface Props {
  conversationId: number
  currentUser: User
  otherUser: User & { isOnline?: boolean }
}

export default function PrivateChat({ conversationId, currentUser, otherUser }: Props) {
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sentFeedback, setSentFeedback] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [displayOtherUser, setDisplayOtherUser] = useState(otherUser)
  
  const { getProfile } = useUserProfileCache()
  
  const {
    messages,
    setMessages,
    isOtherTyping,
    onlineUsers,
    otherUserOnline,
    sendMessage,
    startTyping
  } = useChatSocket({ 
    conversationId, 
    currentUser, 
    otherUserId: otherUser.id,
    otherUserInitialOnline: otherUser.isOnline ?? false
  })

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data)
          
          const unreadIds = data
            .filter((m: any) => !m.read && m.userId !== currentUser.id)
            .map((m: any) => m.id.toString())
          
          if (unreadIds.length > 0) {
            chatSocket.markAsRead(conversationId, unreadIds, String(currentUser.id))
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId, setMessages, currentUser.id])

  useEffect(() => {
    const updatedProfile = getProfile(otherUser.id)
    if (updatedProfile) {
      setDisplayOtherUser(prev => ({
        ...prev,
        username: updatedProfile.username || prev.username,
        avatar: updatedProfile.avatar !== undefined ? updatedProfile.avatar : prev.avatar,
        tankColor: updatedProfile.tankColor !== undefined ? updatedProfile.tankColor : prev.tankColor,
      }))
    }
  }, [getProfile, otherUser.id])

  useEffect(() => {
    const handleProfileUpdate = (e: CustomEvent) => {
      const data = e.detail
      if (data.userId === otherUser.id) {
        setDisplayOtherUser(prev => ({
          ...prev,
          username: data.username !== undefined ? data.username : prev.username,
          avatar: data.avatar !== undefined ? data.avatar : prev.avatar,
          tankColor: data.tankColor !== undefined ? data.tankColor : prev.tankColor,
        }))
      }
      setMessages((prev: Message[]) => prev.map((msg: Message) => {
        if (msg.userId === data.userId) {
          return {
            ...msg,
            user: {
              ...msg.user,
              username: data.username !== undefined ? data.username : msg.user?.username,
              tankColor: data.tankColor !== undefined ? data.tankColor : msg.user?.tankColor,
            }
          }
        }
        return msg
      }))
    }
    window.addEventListener('user-profile-updated', handleProfileUpdate as EventListener)
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate as EventListener)
  }, [otherUser.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return
    
    sendMessage(inputMessage)
    setInputMessage('')
    setSentFeedback(true)
    setTimeout(() => setSentFeedback(false), 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    } else {
      startTyping()
    }
  }

  const isOtherOnline = otherUserOnline || onlineUsers.includes(otherUser.id)

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="avatar-wrapper">
            {displayOtherUser.avatar ? (
              <img 
                src={displayOtherUser.avatar} 
                alt="Avatar"
                className="user-avatar"
              />
            ) : (
              <div 
                className="user-avatar avatar-placeholder"
                style={{ backgroundColor: displayOtherUser.tankColor }}
              >
                {displayOtherUser.username?.charAt(0)}
              </div>
            )}
            <div className={`status-dot ${isOtherOnline ? 'online' : 'offline'}`} />
          </div>
          <div className="user-details">
            <h3 className="user-name">{displayOtherUser.username}</h3>
            <p className="user-status">
              {isOtherTyping ? (
                <span className="typing">typing...</span>
              ) : isOtherOnline ? (
                <span className="online-text">Online</span>
              ) : (
                <span className="offline-text">Offline</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg: Message) => (
          <div
            key={msg.id}
            className={`message-wrapper ${msg.userId === currentUser.id ? 'sent' : 'received'}`}
          >
            <div className="message-bubble">
              {msg.userId !== currentUser.id && (
                <p className="message-sender">
                  {msg.user?.username}
                </p>
              )}
              <p className="message-content">{msg.content}</p>
              <p className="message-time">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isOtherTyping && (
          <div className="message-wrapper received">
            <div className="message-bubble typing-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-container">
        {sentFeedback && (
          <div className="sent-feedback">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Sent!
          </div>
        )}
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="send-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
