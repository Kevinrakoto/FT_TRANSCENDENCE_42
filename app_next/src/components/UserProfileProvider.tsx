// src/components/UserProfileProvider.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export interface UserProfileData {
  id: number
  username: string
  avatar: string | null
  tankName: string | null
  tankColor: string | null
}

interface UserProfileContextType {
  profileCache: Map<number, UserProfileData>
  updateProfile: (userId: number, updates: Partial<UserProfileData>) => void
  getProfile: (userId: number) => UserProfileData | undefined
}

const UserProfileContext = createContext<UserProfileContextType | null>(null)

export function useUserProfileCache() {
  const context = useContext(UserProfileContext)
  if (!context) {
    throw new Error('useUserProfileCache must be used within UserProfileProvider')
  }
  return context
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profileCache, setProfileCache] = useState<Map<number, UserProfileData>>(new Map())

  useEffect(() => {
    const handleProfileUpdate = (e: CustomEvent) => {
      const data = e.detail as { userId: number; username?: string; avatar?: string; tankName?: string; tankColor?: string }
      
      setProfileCache(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(data.userId)
        if (existing) {
          newMap.set(data.userId, { ...existing, ...data })
        }
        return newMap
      })
    }

    window.addEventListener('user-profile-updated', handleProfileUpdate as EventListener)

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate as EventListener)
    }
  }, [])

  const updateProfile = useCallback((userId: number, updates: Partial<UserProfileData>) => {
    setProfileCache(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(userId)
      if (existing) {
        newMap.set(userId, { ...existing, ...updates })
      }
      return newMap
    })
  }, [])

  const getProfile = useCallback((userId: number) => {
    return profileCache.get(userId)
  }, [profileCache])

  return (
    <UserProfileContext.Provider value={{ profileCache, updateProfile, getProfile }}>
      {children}
    </UserProfileContext.Provider>
  )
}