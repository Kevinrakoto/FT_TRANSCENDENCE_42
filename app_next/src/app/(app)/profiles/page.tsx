// src/app/profiles/page.tsx
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
  tankName: string
  tankLevel: number
  gamesAsPlayer: number
  isOnline: boolean
}

export default function ProfilesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    tankName: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchProfile()
      updateOnlineStatus(true)
      chatSocket.connect(String(session.user.id), session.user.username, session.user.tankName)
    }
    
    return () => {
      if (status === 'authenticated') {
        updateOnlineStatus(false)
      }
    }
  }, [status, session])

  const updateOnlineStatus = async (isOnline: boolean) => {
    try {
      await fetch('/api/me/online', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline })
      })
    } catch (error) {
      console.error('Error updating online status:', error)
    }
  }

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
        if (session?.user) {
          chatSocket.updateProfile(session.user.id, { avatar: data.user.avatar })
        }
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
          username: data.user.username || '',
          tankName: data.user.tankName || ''
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
            tankName: data.user.tankName
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
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <Link 
            href="/home" 
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Back
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {profile?.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white"
                  style={{ backgroundColor: profile?.tankName ? `#${Math.abs(parseInt(profile.tankName)).toString(16).slice(0,6)}` || '#4CAF50' : '#4CAF50' }}
                >
                  {profile?.tankName?.charAt(0)?.toUpperCase() || profile?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white p-2 rounded-full cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-gray-400 mt-2">Uploading...</p>}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Tank Name</label>
                <input
                  type="text"
                  value={formData.tankName}
                  onChange={(e) => setFormData({ ...formData, tankName: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Username</span>
                <span className="text-white font-medium">{profile?.username || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Tank Name</span>
                <span className="text-white font-medium">{profile?.tankName || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Email</span>
                <span className="text-white font-medium">{profile?.email}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Tank Level</span>
                <span className="text-white font-medium">{profile?.tankLevel || 1}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Games Played</span>
                <span className="text-white font-medium">{profile?.gamesAsPlayer || 0}</span>
              </div>
              
              <button
                onClick={() => setEditing(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg mt-4"
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
