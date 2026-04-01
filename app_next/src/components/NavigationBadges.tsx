// src/components/NavigationBadges.tsx
'use client'

import Link from 'next/link'
import { useChatNotifications } from '@/hooks/useChatNotifications'

export function NavigationBadges() {
  const { unreadMessagesCount, unreadFriendRequestsCount, activityCount } = useChatNotifications()
  const totalUnread = unreadMessagesCount + unreadFriendRequestsCount + activityCount

  return (
    <Link href="/friends" className="flex items-center">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {unreadFriendRequestsCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-amber-500 animate-pulse">
              {unreadFriendRequestsCount > 9 ? '9+' : unreadFriendRequestsCount}
            </span>
          )}
        </div>

        <div className="relative flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-red-500 animate-pulse">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
        </div>

        <div className="relative flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-blue-500 animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
