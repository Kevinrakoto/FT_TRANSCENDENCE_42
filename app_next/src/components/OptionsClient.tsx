'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OptionsClient() {
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()
  const [tankName, setTankName] = useState('')
  const [tankColor, setTankColor] = useState('#ff0000')
  const [volume, setVolume] = useState(50)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const data = await res.json()
          setTankName(data.user.tankName || '')
          setTankColor(data.user.tankColor || '#ff0000')
        } else if (res.status === 401) {
          router.push('/signin')
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [router])

  const showNotif = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSave = async () => {
    if (!tankName.trim()) {
      showNotif("Tank name cannot be empty", "error")
      return
    }

    if (tankName.length > 20) {
      showNotif("Tank name too long (max 20 characters)", "error")
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankName: tankName.trim(),
          tankColor: tankColor
        })
      })

      if (res.ok) {
        showNotif("Settings saved successfully!", "success")
      } else {
        const data = await res.json()
        showNotif(data.error || "Failed to save settings", "error")
      }
    } catch (error) {
      console.error("Error saving:", error)
      showNotif("Network error. Please try again.", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="game-container"><div className="loading-text">LOADING...</div></div>

  return (
    <div className="game-container">
      <Link href="/home" className="back-button">
        ← BACK
      </Link>

      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            <span className="title-top">HELP &</span>
            <span className="title-main">OPTIONS</span>
          </h1>
        </header>

        <div className="dashboard-content">
          <div className="profile-card" style={{ marginBottom: '20px' }}>
            <div className="profile-info">
              <h3 style={{ color: '#fff', marginBottom: '15px' }}>🎮 CONTROLS</h3>
              <div className="info-row">
                <span className="info-label">MOVE</span>
                <span className="info-value">W, A, S, D</span>
              </div>
              <div className="info-row">
                <span className="info-label">SHOOT</span>
                <span className="info-value">SPACE</span>
              </div>
              <div className="info-row">
                <span className="info-label">PAUSE</span>
                <span className="info-value">ESC</span>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-info">
              <h3 style={{ color: '#fff', marginBottom: '15px' }}>⚙️ SETTINGS</h3>

              <div className="info-row">
                <span className="info-label">TANK NAME</span>
                <input
                  type="text"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  className="info-value"
                  maxLength={20}
                  placeholder="Enter tank name"
                  style={{ background: 'transparent', border: '1px solid #444', color: 'white', padding: '2px 5px' }}
                />
              </div>

              <div className="info-row">
                <span className="info-label">TANK COLOR</span>
                <input
                  type="color"
                  value={tankColor}
                  onChange={(e) => setTankColor(e.target.value)}
                  style={{ width: '50px', height: '30px', cursor: 'pointer' }}
                />
                <span className="info-value level-badge">{tankColor}</span>
              </div>

              <div className="info-row">
                <span className="info-label">VOLUME</span>
                <input
                  type="range"
                  min="0" max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ width: '100px' }}
                />
                <span className="info-value level-badge">{volume}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="menu-button"
            style={{ marginTop: '20px', cursor: 'pointer' }}
            disabled={saving}
          >
            <span className="menu-text">{saving ? 'SAVING...' : 'SAVE CHANGES'}</span>
          </button>
        </div>
      </div>
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}
    </div>
  )
}
