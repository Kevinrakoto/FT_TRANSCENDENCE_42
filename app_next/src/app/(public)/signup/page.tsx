import type { Metadata } from 'next'
import SignUpForm from '@/components/SignUpForm'

export const metadata: Metadata = {
  title: 'Create Account - Tank Battle',
  description: 'Create your Tank Battle account and join the battlefield! Play multiplayer tank battles, track your stats, and climb the leaderboard.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignupPage() {
  return <SignUpForm />
}
