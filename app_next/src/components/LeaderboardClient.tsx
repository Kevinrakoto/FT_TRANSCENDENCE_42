'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useChatNotifications } from '@/hooks/useChatNotifications'

interface LeaderboardPlayer {
  id: number
  username: string
  tankLevel: number
  xp: number
  wins: number
  gamesPlayed: number
}

interface LeaderboardClientProps {
  initialPlayers: LeaderboardPlayer[]
}

export default function LeaderboardClient({ initialPlayers }: LeaderboardClientProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { unreadMessagesCount, unreadFriendRequestsCount } = useChatNotifications()
  const [players, setPlayers] = useState<LeaderboardPlayer[]>(initialPlayers)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'wins' | 'gamesPlayed' | 'xp'>('wins')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/signin')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchLeaderboard() {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=20`)
        const data = await res.json()

        if (data.leaderboard) {
          setPlayers(data.leaderboard)
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [status, sortBy])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.href = '/signin'
  }

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'gold'
      case 1: return 'silver'
      case 2: return 'bronze'
      default: return 'default'
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `${index + 1}`
    }
  }

  const calculateWinRate = (wins: number, games: number) => {
    if (games === 0) return 0
    return Math.round((wins / games) * 100)
  }

  if (status === 'loading') {
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

  return (
    <div className="game-container">
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
            <span className="title-top">LEADERBOARD</span>
            <span className="title-main">LEADERBOARD</span>
          </h1>
        </header>

        <div className="dashboard-content">
          <div className="sort-buttons">
            <button
              className={`sort-button ${sortBy === 'wins' ? 'active' : ''}`}
              onClick={() => setSortBy('wins')}
            >
              WINS
            </button>
            <button
              className={`sort-button ${sortBy === 'gamesPlayed' ? 'active' : ''}`}
              onClick={() => setSortBy('gamesPlayed')}
            >
              GAMES
            </button>
            <button
              className={`sort-button ${sortBy === 'xp' ? 'active' : ''}`}
              onClick={() => setSortBy('xp')}
            >
              XP
            </button>
          </div>

          <div className="leaderboard-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8b8b8b' }}>
                LOADING...
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id}
                  className={`leaderboard-row rank-${getRankColor(index)}`}
                >
                  <div className="rank-cell">
                    <span className="rank-icon">{getRankIcon(index)}</span>
                  </div>
                  <div className="player-info">
                    <Link href={`/profiles/${player.id}`} className="player-name" style={{ textDecoration: 'none' }}>
                      {player.username}
                    </Link>
                    <span className="player-level">Level {player.tankLevel}</span>
                  </div>
                  <div className="player-stats">
                    <div className="stat">
                      <span className="stat-label">Wins</span>
                      <span className="stat-value wins">{player.wins}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Win Rate</span>
                      <span className="stat-value">{calculateWinRate(player.wins, player.gamesPlayed)}%</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">XP</span>
                      <span className="stat-value xp">{player.xp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/dashboard/me" className="back-link">
            ← MY PROFILE
          </Link>
        </div>
      </div>

      <style>{`
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

        .sort-buttons {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          justify-content: center;
        }

        .sort-button {
          padding: 12px 25px;
          background: rgba(30, 30, 50, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #8b8b8b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .sort-button:hover {
          background: rgba(50, 50, 70, 0.8);
          color: white;
        }

        .sort-button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          padding: 20px;
          background: rgba(20, 20, 35, 0.9);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .leaderboard-row:hover {
          transform: translateX(5px);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .leaderboard-row.rank-gold {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(20, 20, 35, 0.9) 100%);
          border-color: rgba(255, 215, 0, 0.3);
        }

        .leaderboard-row.rank-silver {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(20, 20, 35, 0.9) 100%);
          border-color: rgba(192, 192, 192, 0.3);
        }

        .leaderboard-row.rank-bronze {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(20, 20, 35, 0.9) 100%);
          border-color: rgba(205, 127, 50, 0.3);
        }

        .rank-cell {
          width: 50px;
          text-align: center;
        }

        .rank-icon {
          font-size: 24px;
        }

        .player-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 15px;
        }

        .player-name {
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .player-name:hover {
          color: #60a5fa;
        }

        .player-level {
          color: #8b8b8b;
          font-size: 12px;
        }

        .player-stats {
          display: flex;
          gap: 25px;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          color: #8b8b8b;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .stat-value.wins {
          color: #34d399;
        }

        .stat-value.xp {
          color: #60a5fa;
        }

        .back-link {
          display: inline-block;
          margin-top: 30px;
          color: #8b8b8b;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          color: white;
          transform: translateX(-5px);
        }
      `}</style>
    </div>
  )
}
