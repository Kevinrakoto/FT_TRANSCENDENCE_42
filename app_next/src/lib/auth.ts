// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error("Utilisateur non trouvé")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Mot de passe incorrect")
        }

      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() }
      })
      
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        tankName: user.tankName,
        tankColor: user.tankColor
      }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id)
        token.username = user.username
        token.avatar = user.avatar
        token.tankName = user.tankName
        token.tankColor = user.tankColor
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          username: token.username,
          avatar: token.avatar,
          tankName: token.tankName,
          tankColor: token.tankColor
        }
      }
      return session
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        const { prisma } = await import('@/lib/prisma')
        await prisma.user.update({
          where: { id: token.id },
          data: { isOnline: false, lastSeen: new Date() }
        })
      }
    }
  },
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/signin",
    error: "/signin"
  },
  secret: process.env.NEXTAUTH_SECRET
}