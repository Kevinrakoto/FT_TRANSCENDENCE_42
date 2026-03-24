'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type UserData = {
  id: number
  username: string
  email: string
  tankName: string
  tankLevel: number
  gamesAsPlayer: { playerScore: number }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    setIsMounted(true)
    
    document.body.style.visibility = 'hidden'

    async function fetchUser() {
      try {
        const res = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (!res.ok) {
          router.push('/signin')
          return
        }
        
        const data = await res.json()
        
        if (isMounted) {
          setUser(data.user)
          document.body.style.visibility = 'visible'
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        if (isMounted) router.push('/signin')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchUser()

    return () => {
      setIsMounted(false)
      document.body.style.visibility = 'visible'
    }
  }, [router])

  if (loading || !user) {
    return (
      <div className="game-container" style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-text">CHARGEMENT...</div>
      </div>
    )
  }

  return (
    <div className="game-container">
      <Link href="/home" className="back-button">
        ← BACK
      </Link>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            <span className="title-top">PROFILE</span>
            <span className="title-main">{user.tankName || user.username}</span>
          </h1>
        </header>

        <div className="dashboard-content">
          <div className="profile-card">
            <div className="profile-avatar">
              <span className="avatar-icon">🎮</span>
            </div>
            
            <div className="profile-info">
              <div className="info-row">
                <span className="info-label">USERNAME</span>
                <span className="info-value">{user.username}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">EMAIL</span>
                <span className="info-value">{user.email}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">TANK LEVEL</span>
                <span className="info-value level-badge">{user.tankLevel}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">SCORE</span>
                <span className="info-value score-value">
                  {user.gamesAsPlayer[0]?.playerScore ?? "0"}
                </span>
              </div>
            </div>
          </div>

          <Link href="/home" className="menu-button">
            <span className="menu-text">MENU</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
