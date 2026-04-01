// src/components/ChatNotification.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useChatNotifications } from '@/hooks/useChatNotifications'

export default function ChatNotification() {
  const { 
    notifications, 
    unreadCount, 
    unreadMessagesCount, 
    unreadFriendRequestsCount,
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    refreshFriendRequests,
    toast,
    dismissToast,
  } = useChatNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'requests' | 'activity'>('messages')

  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      setIsVisible(true)
      const timer = setTimeout(() => setIsVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [unreadCount, isOpen])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const messageNotifications = notifications.filter(n => n.type === 'message')
  const friendRequestNotifications = notifications.filter(n => n.type === 'friend_request')
  const activityNotifications = notifications.filter(n => 
    ['friend_accepted', 'friend_denied', 'friend_removed'].includes(n.type)
  )

  return (
    <>
      {/* Toast overlay */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-[slideDown_0.3s_ease-out]" onClick={dismissToast}>
          <div className="flex items-center gap-3 bg-gray-900/95 border border-blue-500/50 rounded-xl px-5 py-3 min-w-[300px] max-w-[420px] shadow-2xl backdrop-blur-md cursor-pointer">
            <span className="text-2xl flex-shrink-0">
              {toast.type === 'friend_request' && '👤'}
              {toast.type === 'friend_accepted' && '✅'}
              {toast.type === 'friend_denied' && '❌'}
              {toast.type === 'friend_removed' && '🚫'}
              {toast.type === 'message' && '💬'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                {toast.type === 'friend_request' && 'New Friend Request'}
                {toast.type === 'friend_accepted' && 'Friend Request Accepted'}
                {toast.type === 'friend_denied' && 'Friend Request Declined'}
                {toast.type === 'friend_removed' && 'Friend Removed'}
                {toast.type === 'message' && 'New Messages'}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {toast.message || `${toast.fromUsername} sent you a friend request`}
              </p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); dismissToast(); }} className="text-gray-500 hover:text-white text-xl">&times;</button>
          </div>
        </div>
      )}

      {/* Bell icon */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative bg-gray-800 hover:bg-gray-700 text-white p-3 mt-7 mr-5 rounded-full shadow-lg transition-all border ${unreadCount > 0 ? 'border-red-500 animate-pulse' : 'border-gray-600'}`}
          style={{ outline: unreadCount > 0 ? '2px solid rgba(239, 68, 68, 0.5)' : 'none' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${unreadCount > 0 ? 'text-red-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-20 mt-10 right-0 w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => {
                  setActiveTab('requests')
                  refreshFriendRequests()
                }}
                className={`flex-1 p-3 text-center font-medium text-sm ${activeTab === 'requests' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Requests
                {unreadFriendRequestsCount > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadFriendRequestsCount}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 p-3 text-center font-medium text-sm ${activeTab === 'activity' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Activity
                {activityNotifications.length > 0 && (
                  <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activityNotifications.length}</span>
                )}
              </button>
            </div>

            {activeTab === 'messages' && (
              <>
                <div className="max-h-80 overflow-y-auto">
                  {messageNotifications.length > 0 ? (
                    messageNotifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b border-gray-700 hover:bg-gray-800 transition-colors ${!notif.read ? 'bg-gray-800' : ''}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <Link
                          href={notif.conversationId ? `/chat/${notif.fromUserId}?conversation=${notif.conversationId}` : `/chat/${notif.fromUserId}`}
                          className="block"
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {notif.fromTankName?.charAt(0) || notif.fromUsername?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-white font-medium truncate">
                                  {notif.fromTankName || notif.fromUsername}
                                </p>
                                {!notif.read && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-2"></span>
                                )}
                              </div>
                              <p className="text-gray-400 text-sm truncate">
                                {notif.message}
                              </p>
                              <p className="text-gray-500 text-xs mt-1">
                                {formatTime(notif.timestamp)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No messages yet
                    </div>
                  )}
                </div>
                
                <div className="p-2 bg-gray-800 border-t border-gray-700">
                  <Link
                    href="/friends"
                    className="block text-center text-blue-400 hover:text-blue-300 text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    View all messages
                  </Link>
                </div>
              </>
            )}

            {activeTab === 'requests' && (
              <div className="max-h-80 overflow-y-auto">
                <Link
                  href="/friends"
                  className="block p-4 text-center text-blue-400 hover:text-blue-300 border-b border-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  Manage friend requests →
                </Link>
                {friendRequestNotifications.length > 0 ? (
                  friendRequestNotifications.slice(0, 5).map((notif) => (
                    <div key={notif.id} className="p-3 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {notif.fromTankName?.charAt(0) || notif.fromUsername?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{notif.fromTankName || notif.fromUsername}</p>
                          <p className="text-gray-400 text-xs">@{notif.fromUsername} wants to be friends</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No pending requests
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="max-h-80 overflow-y-auto">
                {activityNotifications.length > 0 ? (
                  activityNotifications.slice(0, 10).map((notif) => (
                    <div 
                      key={notif.id} 
                      className="p-3 border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => {
                        markAsRead(notif.id)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {notif.type === 'friend_accepted' && '✅'}
                          {notif.type === 'friend_denied' && '❌'}
                          {notif.type === 'friend_removed' && '🚫'}
                        </span>
                        <div>
                          <p className="text-white text-sm">{notif.message}</p>
                          <p className="text-gray-500 text-xs">{formatTime(notif.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No recent activity
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
