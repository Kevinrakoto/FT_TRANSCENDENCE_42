import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Select Game Mode',
  description: 'Choose your game mode in Tank Battle. Play solo against AI bots or challenge real players in multiplayer battles.',
}

export default function GameModePage() {
  return (
    <div className="game-container">
      <Link href="/home" className="back-button">
        ← BACK
      </Link>

      <div className="mode-selection-container">
        <header className="mode-selection-header">
          <h1 className="mode-selection-title">
            <span className="title-line-1">SELECT</span>
            <span className="title-line-2">GAME MODE</span>
          </h1>
          <p className="mode-selection-subtitle">
            Choose your battlefield
          </p>
        </header>

        <div className="mode-cards">
          <Link href="/game_mode/solo" className="mode-card solo-card">
            <div className="mode-card-icon">🎯</div>
            <h2 className="mode-card-title">SOLO</h2>
            <p className="mode-card-description">
              Practice against AI bots<br/>
              Perfect your skills
            </p>
            <div className="mode-card-features">
              <span className="feature-tag">⚡ Instant Start</span>
              <span className="feature-tag">🤖 AI Opponents</span>
              <span className="feature-tag">🏆 Earn XP</span>
            </div>
            <div className="mode-card-button">
              <span>PLAY SOLO</span>
              <span className="arrow">→</span>
            </div>
          </Link>

          <Link href="/game_mode/MP" className="mode-card multiplayer-card">
            <div className="mode-card-icon"></div>
            <h2 className="mode-card-title">MULTIPLAYER</h2>
            <p className="mode-card-description">
              Challenge real players<br/>
              Climb the leaderboard
            </p>
            <div className="mode-card-features">
              <span className="feature-tag">Online Matchmaking</span>
              <span className="feature-tag">Real Players</span>
              <span className="feature-tag"> Ranked Mode</span>
            </div>
            <div className="mode-card-button">
              <span>PLAY MULTIPLAYER</span>
              <span className="arrow">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
