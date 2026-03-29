'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface GameRecord {
  id: number
  opponentId: number | null
  winnerId: number | null
  playerScore: number
  opponentScore: number | null
  duration: number
  createdAt: Date
}

interface UserData {
  id: number
  username: string
  tankColor: string
  tankLevel: number
  xp: number
  wins: number
  kills: number
  deaths: number
  gamesPlayed: number
  avatar: string | null
  isOnline: boolean
  lastSeen: Date | null
  createdAt: Date
  gamesAsPlayer: GameRecord[]
}

interface Props {
  user: UserData
  currentUserId: number
}

export default function UserProfileClient({ user, currentUserId }: Props) {
  const router = useRouter()
  const [addingFriend, setAddingFriend] = useState(false)
  const [friendStatus, setFriendStatus] = useState<string | null>(null)

  const calculateWinRate = () => {
    if (user.gamesPlayed === 0) return 0
    return Math.round((user.wins / user.gamesPlayed) * 100)
  }

  const calculateKDR = () => {
    if (user.deaths === 0) return user.kills
    return (user.kills / user.deaths).toFixed(1)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatLastSeen = (date: Date | null) => {
    if (!date) return 'Unknown'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return formatDate(d)
  }

  const handleSendFriendRequest = async () => {
    setAddingFriend(true)
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setFriendStatus('Request sent!')
      } else {
        setFriendStatus(data.error || 'Failed to send request')
      }
    } catch {
      setFriendStatus('Network error')
    } finally {
      setAddingFriend(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Player Profile</h1>
          <Link
            href="/home"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Back
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4"
                  style={{ borderColor: user.tankColor }}
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4"
                  style={{ backgroundColor: user.tankColor, borderColor: user.tankColor }}
                >
                  {user.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div
                className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-gray-800 ${
                  user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">{user.username}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {user.isOnline ? (
                <span className="text-green-400">● Online</span>
              ) : (
                <span>Last seen {formatLastSeen(user.lastSeen)}</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{user.tankLevel}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Level</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{user.xp.toLocaleString()}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">XP</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{calculateWinRate()}%</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Win Rate</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Wins</span>
              <span className="text-green-400 font-bold">{user.wins}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Games Played</span>
              <span className="text-white font-medium">{user.gamesPlayed}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">K/D Ratio</span>
              <span className="text-white font-medium">{calculateKDR()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Kills / Deaths</span>
              <span className="text-white font-medium">{user.kills} / {user.deaths}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Joined</span>
              <span className="text-white font-medium">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>

        {user.gamesAsPlayer.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Games</h3>
            <div className="space-y-2">
              {user.gamesAsPlayer.map((game) => {
                const isWin = game.winnerId === user.id
                return (
                  <div
                    key={game.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isWin ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                        {isWin ? 'WIN' : 'LOSS'}
                      </span>
                      <span className="text-white text-sm">
                        {game.playerScore} - {game.opponentScore ?? 0}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-xs">{formatDuration(game.duration)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSendFriendRequest}
            disabled={addingFriend || friendStatus !== null}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {friendStatus || (addingFriend ? 'Sending...' : 'Add Friend')}
          </button>
          <Link
            href="/home"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium text-center transition-colors"
          >
            Main Menu
          </Link>
        </div>
      </div>
    </div>
  )
}
