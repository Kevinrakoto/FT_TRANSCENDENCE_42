'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useChatNotifications } from '@/hooks/useChatNotifications'

interface UserData {
  id: number
  username: string
  email: string
  tankLevel: number
  xp: number
  wins: number
  kills: number
  gamesPlayed: number
  avatar: string | null
  gamesAsPlayer: { playerScore: number }[]
}

export default function DashboardClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { unreadMessagesCount, unreadFriendRequestsCount } = useChatNotifications()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/signin')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchUser() {
      try {
        const res = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include'
        })

        if (!res.ok) return

        const data = await res.json()
        setUser(data.user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [status])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/signin'
  }

  const calculateWinRate = () => {
    if (!user || !user.gamesPlayed || user.gamesPlayed === 0) return 0
    return Math.round((user.wins || 0) / user.gamesPlayed * 100)
  }

  const getXp = () => user?.xp ?? 0
  const getWins = () => user?.wins ?? 0
  const getGamesPlayed = () => user?.gamesPlayed ?? 0
  const getKills = () => user?.kills ?? 0

  if (loading || status === 'loading') {
    return (
      <div className="game-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-text">LOADING...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="landing-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
         <div className='landing-background'></div>
        <div className="loading-text">LOADING...</div>
      </div>
    )
  }

  return (
    <div className="landing-container">
      <div className='landing-background'></div>
      <Link href="/friends" className="friends-button" title="friend list">
        <svg
          className="friends-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {(unreadFriendRequestsCount > 0 || unreadMessagesCount > 0) && (
          <span className="notification-badge">
            {unreadFriendRequestsCount + unreadMessagesCount > 9
              ? '9+'
              : unreadFriendRequestsCount + unreadMessagesCount}
          </span>
        )}
      </Link>

      <button
        onClick={handleLogout}
        className="logout-button"
        title="Sign out"
      >
        <svg
          className="logout-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            <span className="title-top">MY PROFILE</span>
            <span className="title-main">{user.username}</span>
          </h1>
        </header>

          <div className="vector-card-dash">
            <div className="profile-avatar-large">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="avatar-image" />
              ) : (
                <span className="avatar-icon">🎮</span>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-label">LEVEL</span>
                <span className="stat-value level">{user.tankLevel ?? 1}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">XP</span>
                <span className="stat-value xp">{getXp().toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">WIN RATE</span>
                <span className="stat-value winrate">{calculateWinRate()}%</span>
              </div>
            </div>

            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">USERNAME</span>
                <span className="detail-value">{user.username}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">EMAIL</span>
                <span className="detail-value">{user.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">WINS</span>
                <span className="detail-value wins">{getWins()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GAMES PLAYED</span>
                <span className="detail-value">{getGamesPlayed()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">KILLS</span>
                <span className="detail-value">{getKills()}</span>
              </div>
          </div>

          <div className="profile-actions">
            <Link href="/home" className="menu-item">
              <span>MAIN MENU</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
