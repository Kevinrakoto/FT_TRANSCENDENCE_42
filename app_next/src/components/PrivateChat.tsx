// src/components/PrivateChat.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useChatSocket } from '@/hooks/useChatSocket'
import { User, Message } from '@/types/chat'

interface Props {
  conversationId: number
  currentUser: User
  otherUser: User & { isOnline?: boolean }
}

export default function PrivateChat({ conversationId, currentUser, otherUser }: Props) {
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
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
          console.log('Messages received:', data)
          setMessages(data)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversationId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return
    
    sendMessage(inputMessage)
    setInputMessage('')
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
            {otherUser.avatar ? (
              <img 
                src={otherUser.avatar} 
                alt="Avatar"
                className="user-avatar"
              />
            ) : (
              <div 
                className="user-avatar avatar-placeholder"
                style={{ backgroundColor: otherUser.tankColor }}
              >
                {otherUser.tankName?.charAt(0) || otherUser.username?.charAt(0)}
              </div>
            )}
            <div className={`status-dot ${isOtherOnline ? 'online' : 'offline'}`} />
          </div>
          <div className="user-details">
            <h3 className="user-name">{otherUser.tankName || otherUser.username}</h3>
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
                  {msg.user?.tankName || msg.user?.username}
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

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(20, 20, 30, 0.9);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chat-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #8b8b8b;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .chat-header {
          padding: 16px 20px;
          background: rgba(30, 30, 40, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chat-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-wrapper {
          position: relative;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }

        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #1e1e28;
        }

        .status-dot.online {
          background: #10b981;
        }

        .status-dot.offline {
          background: #6b7280;
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          color: white;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .user-status {
          font-size: 12px;
        }

        .typing {
          color: #10b981;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .online-text {
          color: #10b981;
        }

        .offline-text {
          color: #6b7280;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-wrapper {
          display: flex;
          max-width: 75%;
        }

        .message-wrapper.sent {
          align-self: flex-end;
        }

        .message-wrapper.received {
          align-self: flex-start;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          max-width: 100%;
        }

        .sent .message-bubble {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .received .message-bubble {
          background: rgba(40, 40, 55, 0.9);
          color: #e5e7eb;
          border-bottom-left-radius: 4px;
        }

        .message-sender {
          font-size: 11px;
          color: #9ca3af;
          margin-bottom: 4px;
        }

        .message-content {
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .message-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }

        .typing-bubble {
          padding: 12px 20px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #6b7280;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }

        .chat-input-container {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(30, 30, 40, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(20, 20, 30, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-input::placeholder {
          color: #6b7280;
        }

        .chat-input:focus {
          border-color: #3b82f6;
        }

        .send-button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
