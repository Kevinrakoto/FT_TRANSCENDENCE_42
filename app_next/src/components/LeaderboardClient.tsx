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
              players?.map((player, index) => (
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
    </div>
  )
}
