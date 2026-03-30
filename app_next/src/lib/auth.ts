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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
           throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
           throw new Error("User not found")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
           throw new Error("Incorrect password")
        }

        // If user is already online, force the old session to disconnect
        if (user.isOnline) {
          try {
            const https = await import('https')
            const agent = new https.Agent({ rejectUnauthorized: false })
            await fetch('https://localhost:3000/api/force-logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
              // @ts-ignore - Node.js fetch supports agent
              agent,
            })
          } catch (e) {
            // Old session may not have an active socket - safe to ignore
          }
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
          tankColor: token.tankColor
        }
      }
      return session
    }
  },
   events: {
     async signOut({ token }) {
       if (token?.id) {
         try {
           await prisma.user.update({
             where: { id: token.id },
             data: { isOnline: false, lastSeen: new Date() }
           })
         } catch (error) {
           console.error('Error in signOut event:', error)
         }
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