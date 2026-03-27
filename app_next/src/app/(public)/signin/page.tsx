import type { Metadata } from 'next'
import SignInForm from '@/components/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In - Tank Battle',
  description: 'Sign in to your Tank Battle account to play multiplayer tank battles, manage your profile, and compete on the leaderboard.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginPage() {
  return <SignInForm />
}
