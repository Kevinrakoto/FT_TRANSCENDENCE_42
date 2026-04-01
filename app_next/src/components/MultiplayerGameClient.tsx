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

		let resultsSaved = false;
		const gameCallback = {
			onGameStart: () => setIsGameRunning(true),
			onGameOver: async (data) => {
				setGameOverData(data)
				if (resultsSaved) return;
				resultsSaved = true;
				try {
					const myEntry = data.leaderboard.find(
						(e: any) => e.userId === freshUserData?.id
					);
					if (!myEntry) return;
					const res = await fetch('/api/game/results', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							leaderboard: [myEntry],
							duration: 0,
							gameMode: gameMode
						})
					})
					if (res.ok) {
					}
				} catch (e) {
					console.error('Failed to save game results:', e)
				}
			},
			onLeaderboardUpdate: (data: any) => setLeaderboard(data)
		};

		const cleanup = launchGame(gameContainerRef.current, gameCallback, freshUserData, gameMode);

		return () => {
			cleanup();
		};

	}, [gameMode, freshUserData]);

    if (!gameMode) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                 {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950"></div>
                
                <div className="z-10 text-center space-y-8 animate-in zoom-in duration-300">
                    <h1 className="text-6xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl">
                        SELECT MODE
                    </h1>
                    <p className="text-gray-400 uppercase tracking-widest text-sm">
                        Choose your battlefield size
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        {/* 1v1 Card */}
                        <button onClick={() => setGameMode(2)} 
                                className="group relative bg-gray-900/50 border border-white/10 p-8 rounded-2xl hover:bg-blue-600 hover:border-blue-400 transition-all duration-300 hover:scale-105 active:scale-95 text-left w-64">
                            <div className="text-4xl font-black text-white mb-2 group-hover:text-white">1v1</div>
                            <div className="text-gray-400 text-sm group-hover:text-blue-100">Duel</div>
                            <div className="absolute bottom-4 right-4 text-6xl opacity-10 font-black">2</div>
                        </button>

                        {/* 1v1v1 Card */}
                        <button onClick={() => setGameMode(3)}
                                className="group relative bg-gray-900/50 border border-white/10 p-8 rounded-2xl hover:bg-purple-600 hover:border-purple-400 transition-all duration-300 hover:scale-105 active:scale-95 text-left w-64">
                            <div className="text-4xl font-black text-white mb-2 group-hover:text-white">1v1v1</div>
                            <div className="text-gray-400 text-sm group-hover:text-purple-100">Triple Threat</div>
                            <div className="absolute bottom-4 right-4 text-6xl opacity-10 font-black">3</div>
                        </button>

                         {/* 1v1v1v1 Card */}
                         <button onClick={() => setGameMode(4)}
                                className="group relative bg-gray-900/50 border border-white/10 p-8 rounded-2xl hover:bg-red-600 hover:border-red-400 transition-all duration-300 hover:scale-105 active:scale-95 text-left w-64">
                            <div className="text-4xl font-black text-white mb-2 group-hover:text-white">1v1v1v1</div>
                            <div className="text-gray-400 text-sm group-hover:text-red-100">4 Player Chaos</div>
                            <div className="absolute bottom-4 right-4 text-6xl opacity-10 font-black">4</div>
                        </button>
                    </div>

                    <button onClick={() => router.back()} className="text-gray-500 hover:text-white mt-12 underline text-sm">
                        Return to Main Menu
                    </button>
                </div>
            </div>
        )
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
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-2xl font-bold animate-pulse">SEARCHING FOR PLAYERS...</h2>
                <p className="text-gray-500 mt-2">Mode: {gameMode} Players</p>
                <button onClick={() => window.location.reload()} className="mt-8 text-sm underline text-gray-400 hover:text-white">Cancel</button>
            </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameOverData && (() => {
            // Sort the leaderboard locally to find who has the most points
            const sortedBoard = [...leaderboard].sort((a: any, b: any) => b.score - a.score);
            const topPlayer = sortedBoard[0]?.username;
            const isWinner = topPlayer === freshUserData?.username;

            return (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        
                        {/* Background Glow Effect */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-3xl pointer-events-none ${
                            isWinner 
                            ? 'bg-gradient-to-b from-yellow-500/30 to-transparent' 
                            : 'bg-gradient-to-b from-red-500/30 to-transparent'
                        }`}/>

                        <div className="text-center mb-8 relative z-10">
                            <h1 className={`text-5xl font-black tracking-tighter mb-2 italic ${
                                isWinner ? 'text-yellow-400' : 'text-red-500'
                            }`}>
                                {isWinner ? 'YOU WIN!' : 'YOU LOSE'}
                            </h1>
                            <p className="text-gray-400 uppercase tracking-widest text-sm">
                                {isWinner 
                                    ? 'Victory Secured' 
                                    : `${topPlayer || 'Someone'} won the match`}
                            </p>
                        </div>

                        {/* Final Standings List */}
                        <div className="space-y-3 mb-8 relative z-10">
                            {sortedBoard.map((p: any, index: number) => (
                                <div key={p.userId || p.username} className={`flex items-center justify-between p-4 rounded-xl border ${
                                    index === 0 
                                        ? 'bg-yellow-500/10 border-yellow-500/50' 
                                        : 'bg-white/5 border-white/5'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                            index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <span className={`font-bold ${index === 0 ? 'text-yellow-200' : 'text-white'}`}>
                                            {p.username}
                                        </span>
                                    </div>
                                    <span className="font-mono text-xl font-bold text-white">
                                        {p.score} <span className="text-xs text-gray-500 font-normal ml-1">KILLS</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <button
                                onClick={() => window.location.reload()}
                                className="py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 hover:scale-[1.02] transition-all active:scale-95"
                            >
                                PLAY AGAIN
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 hover:scale-[1.02] transition-all active:scale-95"
                            >
                                EXIT
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* LIVE HUD LEADERBOARD */}
        <div className="absolute top-4 right-4 z-40 bg-black/60 text-white p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-xl min-w-[200px]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                Live Standings
            </h3>
            
            <div className="space-y-2">
                {[...leaderboard]
                    .sort((a, b) => b.score - a.score)
                    .map((p, index) => (
                        <div key={p.userId || p.username} className={`flex items-center justify-between text-sm p-2 rounded-lg transition-colors ${
                            session?.user?.username === p.username ? 'bg-white/10 ring-1 ring-white/20' : ''
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className={`font-mono w-4 text-center ${
                                    index === 0 ? 'text-yellow-400 font-bold' : 
                                    index === 1 ? 'text-gray-300' : 
                                    index === 2 ? 'text-orange-400' : 'text-gray-500'
                                }`}>
                                    {index + 1}
                                </span>
                                <span className="font-medium truncate max-w-[100px]">{p.username}</span>
                            </div>
                            <span className="font-bold font-mono text-yellow-500 ml-4">
                                {p.score}
                            </span>
                        </div>
                    ))}
            </div>
        </div>


		<div
			ref={gameContainerRef}
			id="tank-game-root"
			className="w-full h-screen block"
		/>
	</div>
	);
}