// src/types/chat.ts
export interface User {
  id: number
  username: string
  avatar?: string | null
  tankName?: string
  tankColor?: string
}

export interface Message {
  id: number
  content: string
  userId: number
  user: User
  conversationId: number
  readBy: { userId: number }[]
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: number
  type: 'PRIVATE' | 'GROUP'
  user1Id: number | null
  user2Id: number | null
  createdAt: string
  updatedAt: string
  participants: ConversationParticipant[]
  messages: Message[]
}

export interface ConversationParticipant {
  id: number
  userId: number
  conversationId: number
  lastReadAt: string | null
  joinedAt: string
  user: User
}

export interface Friendship {
  id: number
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
  senderId: number
  receiverId: number
  createdAt: string
  sender?: User
  receiver?: User
}

export interface FriendRequest {
  id: number
  sender: User
  createdAt: string
}