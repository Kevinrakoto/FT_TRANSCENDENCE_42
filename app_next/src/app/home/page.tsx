"use client"

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { chatSocket } from '@/lib/socket-client';
import { NavigationBadges } from '@/components/NavigationBadges';

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/signin');
        }
    }, [session, status, router]);

    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            chatSocket.connect(
                String(session.user.id), 
                session.user.username || '', 
                session.user.tankName || ''
            );
        }
    }, [status, session]);

    const handleLogout = async () => {
        if (session?.user) {
            chatSocket.disconnect();
            await fetch('/api/me/online', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isOnline: false })
            });
        }
        signOut({ callbackUrl: '/signin' });
    };

    if (status === 'loading') {
        return <div>Loading...</div>;
    }

    if (!session) {
        return null;
    }

    return (
        <div className="game-container">

            <Link href="/friends" className="friends-button" title="friend list">
                <svg 
                    className="friends-icon" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
                <NavigationBadges />
            </Link>
            <button 
                onClick={handleLogout}
                className="logout-button"
                title="Sign out"
            >
                <svg 
                    className="logout-icon" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            <header className="game-header">
                <h1 className="game-title">
                    <span className="title-top">TANK</span>
                    <span className="title-main">BATTLE</span>
                </h1>
            </header>

            <nav className="game-menu">
                <Link href="/game_mode" className="menu-item menu-item-play">
                    <span className="menu-text">Play</span>
                </Link>
                
                <Link href="/profiles" className="menu-item">
                    <span className="menu-text">Profiles</span>
                </Link>
                
                <Link href="/options" className="menu-item">
                    <span className="menu-text">Help & Options</span>
                </Link>
                
                <Link href="/leaderboard" className="menu-item">
                    <span className="menu-text">Leaderboard</span>
                </Link>

                <Link href="/friends/requests" className="menu-item menu">
                    <span className="menu-text">Request</span>
                </Link>
            </nav>
            <div className="tank-decoration">
                🛡️
            </div>
        </div>
    );
}