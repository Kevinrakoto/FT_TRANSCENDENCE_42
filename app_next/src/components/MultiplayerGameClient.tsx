'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { launchGame } from '@/app/(app)/game_mode/MP/scripts/game.js';

export default function MultiplayerGameClient() {
	const {data : session, status} = useSession();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [gameMode, setGameMode] = useState<number | null>(null);
	const [isGameRunning, setIsGameRunning] = useState(false);
	const [gameOverData, setGameOverData] = useState<any>(null);
	const [leaderboard, setLeaderboard] = useState([]);
	const [freshUserData, setFreshUserData] = useState<any>(null);

	const gameContainerRef = useRef(null);

	useEffect(() => {
		if (status === "loading") return;
		if (!session) {
			router.replace('/signin');
			return ;
		}

		async function fetchUserData() {
			try {
				const res = await fetch('/api/me');
				if (res.ok) {
					const data = await res.json();
					setFreshUserData({
						id: data.user.id,
						username: data.user.username,
						tankColor: data.user.tankColor
					});
				}
			} catch (e) {
				console.error('Error fetching user data:', e);
			}
		}

		fetchUserData();
	}, [session, status, router]);

	useEffect(() => {
		if (!gameMode || !gameContainerRef.current || !freshUserData) return;
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

		const gameCallback = {
			onGameStart: () => setIsGameRunning(true),
			onGameOver: (data) => setGameOverData(data),
			onLeaderboardUpdate: (data: any) => setLeaderboard(data)
		};

		const cleanup = launchGame(gameContainerRef.current, gameCallback, freshUserData, gameMode);

		return () => {
			cleanup();
		};

	}, [gameMode, freshUserData]);

	// --- 1. MODE SELECTION SCREEN ---
	if (!gameMode) {
		return (
			<div className="landing-container">
				<div className="landing-background"></div>
				<div className="dashboard-container">
					<header className="dashboard-header">
						<h1 className="dashboard-title">
							<span className="title-top">SELECT</span>
							<span className="title-main">GAME MODE</span>
						</h1>
					</header>

					<div className="vector-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
						<div className="profile-actions" style={{ flexDirection: 'column', gap: '15px' }}>
							<button onClick={() => setGameMode(2)} className="menu-item" style={{ width: '100%', justifyContent: 'center' }}>
								<span>1v1 DUEL</span>
							</button>
							<button onClick={() => setGameMode(3)} className="menu-item" style={{ width: '100%', justifyContent: 'center' }}>
								<span>1v1v1 TRIPLE</span>
							</button>
							<button onClick={() => setGameMode(4)} className="menu-item" style={{ width: '100%', justifyContent: 'center' }}>
								<span>4 PLAYER CHAOS</span>
							</button>
						</div>
					</div>

					<div style={{ textAlign: 'center', marginTop: '30px' }}>
						<Link href="/home" className="back-button" style={{ position: 'relative', left: '0', top: '0' }}>
							← RETURN TO MENU
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
	<div>
		<button
		onClick={() => router.back()}
		className="absolute top-4 left-4 z-50 bg-gray-600 hover:bg-gray-700
					text-white px-4 py-2 rounded-lg"
		>
			← Return
		</button>

		{!isGameRunning && (
			<div className="landing-container" style={{ position: 'absolute', zIndex: 50, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
				<div className="landing-background"></div>
				<div className="loading-text" style={{ fontSize: '24px', letterSpacing: '4px' }}>SEARCHING FOR PLAYERS...</div>
				<div className="detail-label" style={{ marginTop: '10px' }}>MODE: {gameMode} PLAYERS</div>
				<button onClick={() => window.location.reload()} className="back-button" style={{ position: 'relative', left: '0', top: '0', marginTop: '30px' }}>
					CANCEL
				</button>
			</div>
		)}

        {/* GAME OVER SCREEN */}
		{gameOverData && (() => {
			const sortedBoard = [...leaderboard].sort((a: any, b: any) => b.score - a.score);
			const topPlayer = sortedBoard[0]?.username;
			const isWinner = topPlayer === freshUserData?.username;

			return (
				<div className="landing-container" style={{ position: 'absolute', zIndex: 100, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)' }}>
					<div className="dashboard-container" style={{ paddingTop: '10vh' }}>
						<header className="dashboard-header">
							<h1 className="dashboard-title">
								<span className="title-top">MATCH OVER</span>
								<span className="title-main" style={{ color: isWinner ? '#fbbf24' : '#ef4444' }}>
									{isWinner ? 'YOU WIN!' : 'YOU LOSE'}
								</span>
							</h1>
						</header>
						<div className="vector-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
							<div className="profile-details">
								{sortedBoard.map((p: any, index: number) => (
									<div key={p.username} className="detail-row">
										<span className="detail-label" style={{ color: index === 0 ? '#fbbf24' : '#ffffff' }}>
											{index + 1}. {p.username}
										</span>
										<span className="detail-value score">{p.score} KILLS</span>
									</div>
								))}
							</div>

							<div className="profile-actions" style={{ flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
								<button onClick={() => window.location.reload()} className="menu-item" style={{ width: '100%', justifyContent: 'center' }}>
									<span>PLAY AGAIN</span>
								</button>
								<button onClick={() => router.back()} className="menu-item" style={{ width: '100%', justifyContent: 'center', background: 'transparent', border: '2px solid rgba(255,255,255,0.2)' }}>
									<span>EXIT TO MENU</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			);
		})()}

        {/* LIVE HUD LEADERBOARD */}
		{isGameRunning && !gameOverData && (
			<div style={{
				position: 'absolute',
				top: '20px',
				right: '20px',
				zIndex: 40,
				background: 'rgba(20, 20, 35, 0.85)',
				border: '1px solid rgba(255, 255, 255, 0.1)',
				backdropFilter: 'blur(10px)',
				borderRadius: '8px',
				padding: '15px',
				minWidth: '220px'
			}}>
				<div className="detail-label" style={{ marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
					LIVE STANDINGS
				</div>
				
				<div className="profile-details" style={{ background: 'transparent', padding: '0' }}>
					{leaderboard
						.sort((a, b) => b.score - a.score)
						.map((p, index) => {
							const isMe = session?.user?.username === p.username;
							return (
								<div key={p.username} className="detail-row" style={{ borderBottom: 'none', padding: '6px 0' }}>
									<span className="detail-label" style={{ color: isMe ? '#ffffff' : '#8b8b8b' }}>
										{index + 1}. {p.username}
									</span>
									<span className="detail-value score">{p.score}</span>
								</div>
							);
						})
					}
				</div>
			</div>
		)}

		<div
			ref={gameContainerRef}
			id="tank-game-root"
			className="w-full h-screen block"
		/>
	</div>
	);
}
