'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { chatSocket } from '@/lib/socket-client'

interface UserProfile {
  id: number
  email: string
  username: string
  avatar: string | null
  tankLevel: number
  gamesAsPlayer: number
  isOnline: boolean
}

export default function ProfilesClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    username: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchProfile()
    }
  }, [status, session])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await fetch('/api/profiles/avatar', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { ...prev, avatar: data.user.avatar } : null)
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setUploading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/me')
      const data = await res.json()
      if (data.user) {
        setProfile(data.user)
        setFormData({
          username: data.user.username || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/profiles/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data.user)
        setEditing(false)
        if (session?.user) {
          chatSocket.updateProfile(session.user.id, {
            username: data.user.username,
          })
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="loading-text">LOADING...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

return (
  <div className="game-container relative min-h-screen">
    <div className="absolute inset-0 bg-black/40 z-0 fade"></div>
      <Link href="/home" className="back-button">
        ← BACK
      </Link>
    <div className="animate-fadeInUp relative z-10 container mx-auto px-4 max-w-2xl py-10">
      
      <div className="card-title-wrapper">
        <h1 className="title-top">My Profile</h1>
      </div>

      <div className="bg-white/20 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white border-2 border-white/20"
                style={{ backgroundColor: '#4CAF50' }}
              >
                {profile?.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}

            <label htmlFor="profile-avatar-upload" className="absolute bottom-0 right-0 bg-green-500/80 hover:bg-green-400 backdrop-blur-md text-white p-2 rounded-full cursor-pointer transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>

              <input
                type="file"
                id="profile-avatar-upload"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && (
            <p className="text-gray-300 mt-2">Uploading...</p>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-username" className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                id="profile-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500/80 hover:bg-orange-400 backdrop-blur-md text-white py-2 rounded-lg transition-all duration-200"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-2 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* VIEW MODE */
          <div className="space-y-4">
            
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-gray-300">Username</span>
              <span className="text-white font-medium">
                {profile?.username || 'Not set'}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-gray-300">Email</span>
              <span className="text-white font-medium">
                {profile?.email}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-gray-300">Tank Level</span>
              <span className="text-white font-medium">
                {profile?.tankLevel || 1}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-gray-300">Games Played</span>
              <span className="text-white font-medium">
                {profile?.gamesAsPlayer || 0}
              </span>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="submit-button-si"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)
}
