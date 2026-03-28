'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { chatSocket } from '@/lib/socket-client'
import { useChatNotifications } from '@/hooks/useChatNotifications'

interface UserData {
  id: number
  username: string
  email: string
  tankName: string
  tankLevel: number
  xp: number
  wins: number
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
    if (status === 'authenticated' && session?.user) {
      chatSocket.connect(String(session.user.id), session.user.username, session.user.tankName)
    }

    return () => {
      if (status === 'authenticated') {
        chatSocket.disconnect()
      }
    }
  }, [status, session])

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
    if (session?.user) {
      chatSocket.disconnect()
    }
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

          <div className="vector-card">
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
                <span className="detail-label">BEST SCORE</span>
                <span className="detail-value score">
                  {user.gamesAsPlayer[0]?.playerScore ?? "0"}
                </span>
              </div>
          </div>

          <div className="profile-actions">
            <Link href="/home" className="menu-item">
              <span>MAIN MENU</span>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-card {
          background: rgba(20, 20, 35, 0.9);
          border-radius: 16px;
          padding: 25px;
          padding-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          max-width: 400px;
          margin: 0 auto;
        }

        .profile-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-icon {
          font-size: 35px;
        }

        .profile-stats {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .stat-box {
          text-align: center;
          padding: 10px 15px;
          background: rgba(30, 30, 50, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 70px;
        }

        .stat-label {
          display: block;
          font-size: 9px;
          font-weight: 600;
          color: #8b8b8b;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }

        .stat-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
        }

        .stat-value.level {
          color: #fbbf24;
        }

        .stat-value.xp {
          color: #60a5fa;
        }

        .stat-value.winrate {
          color: #34d399;
        }

        .profile-details {
          background: rgba(30, 30, 50, 0.5);
          border-radius: 8px;
          padding: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: #8b8b8b;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .detail-value {
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
        }

        .detail-value.wins {
          color: #34d399;
        }

        .detail-value.score {
          color: #fbbf24;
        }

        .profile-actions {
          display: flex;
          justify-content: center;
          margin-top: 25px;
          padding-left: 0;
        }

        .menu-item-button {
          display: flex;
          align-items: center;
          gap: 15px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          padding: 12px 24px;
          cursor: pointer;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: 8px;
          border: 2px solid #f97316;
          box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
        }

        .menu-item-button::before {
          content: '▶';
          position: absolute;
          left: -25px;
          opacity: 0;
          transition: all 0.3s ease;
          color: #f97316;
          font-size: 1rem;
        }

        .menu-item-button:hover {
          color: #00d9ff;
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
        }

        .menu-item-button:hover::before {
          opacity: 1;
          left: -20px;
        }

        .menu-item-button:hover .menu-item-text {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .menu-item-text {
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }

        .menu-item-button.secondary {
          background: transparent;
          border: 2px solid rgba(255, 255, 255, 0.4);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
        }

        .menu-item-button.secondary:hover {
          color: #00d9ff;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
