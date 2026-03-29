// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: number
      username: string
      avatar: string | null
      tankColor: string
    } & DefaultSession["user"]
  }

  interface User {
    id: number
    username: string
    avatar: string | null
    tankColor: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number
    username: string
    avatar: string | null
    tankColor: string
  }
}