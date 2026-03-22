'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { launchGame } from './scripts/game.js';

export default function MultiplayerGamePage() {
	const {data : session, status} = useSession();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	const gameContainerRef = useRef(null);

	useEffect(() => {
		if (status === "loading") return;
		if (!gameContainerRef.current) return;

		if (!session) {
			router.replace('/signin');
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) {
				setError('WebGL non supporté');
				return;
			}
		} catch (e) {
			return;
		}

		const cleanup = launchGame(gameContainerRef.current);

		return () => {
			cleanup();
		};
	}, [session, status, router]);

	return (
	<div>
		<button
		onClick={() => router.back()}
		className="absolute top-4 left-4 z-50 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
		>
			← Return
		</button>
		<div
			ref={gameContainerRef}
			id="tank-game-root"
			className="w-full h-screen block"
		/>
	</div>
	);
}
