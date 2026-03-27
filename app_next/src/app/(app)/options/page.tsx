import type { Metadata } from 'next'
import OptionsClient from '@/components/OptionsClient'

export const metadata: Metadata = {
  title: 'Help & Options',
  description: 'Configure your Tank Battle settings, customize your tank name and color, and view game controls.',
}

export default function HelpAndOptionsPage() {
  return <OptionsClient />
}
