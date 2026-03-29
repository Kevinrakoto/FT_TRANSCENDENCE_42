'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TankGameClient() {
  const {data : session, status} = useSession();
  const router = useRouter();
  const [webGLReady, setWebGLReady] = useState(false);
  
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace('/signin');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL non supporté');
      setWebGLReady(true);
    } catch (e) {
      return;
    }
  import('@/app/(app)/tank-game/scripts/game.js').then(() => console.log('game script loaded'));
}, [session, status, router]);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
      >
        ← Return
      </button>
      <div id="tank-game-root" style={{ width: '100vw', height: '100vh' }} />
    </div>
  );
}
