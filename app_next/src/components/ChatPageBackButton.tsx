'use client'

import { useRouter } from 'next/navigation'

export default function ChatPageBackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="mb-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
    >
      ← Return
    </button>
  )
}
