// src/components/NavigationBadges.tsx
'use client'

import Link from 'next/link'
import { useChatNotifications } from '@/hooks/useChatNotifications'

export function NavigationBadges() {
  const { unreadMessagesCount, unreadFriendRequestsCount } = useChatNotifications()

  return (
    <div className="flex items-center gap-4">
      <Link href="/friends" className="nav-badge-container">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {unreadFriendRequestsCount > 0 && (
          <span className="nav-badge friend-requests">{unreadFriendRequestsCount > 9 ? '9+' : unreadFriendRequestsCount}</span>
        )}
      </Link>

      <Link href="/friends" className="nav-badge-container">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {unreadMessagesCount > 0 && (
          <span className="nav-badge messages">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
        )}
      </Link>

      <style jsx>{`
        .nav-badge-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b8b8b;
          transition: color 0.2s;
        }

        .nav-badge-container:hover {
          color: white;
        }

        .nav-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          animation: pulse 2s infinite;
        }

        .nav-badge.friend-requests {
          background: #f59e0b;
        }

        .nav-badge.messages {
          background: #ef4444;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
