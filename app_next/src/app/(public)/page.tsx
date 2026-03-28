import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tank Battle - Multiplayer Tank Game',
  description: 'Choose your destiny in Tank Battle! Sign in or create an account to play multiplayer tank battles with friends. Compete on the leaderboard and rise to the top.',
  openGraph: {
    title: 'Tank Battle - Multiplayer Tank Game',
    description: 'Choose your destiny in Tank Battle! Sign in or create an account to play multiplayer tank battles with friends.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tank Battle - Multiplayer Tank Game',
    description: 'Choose your destiny in Tank Battle! Sign in or create an account to play multiplayer tank battles with friends.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-background"></div>

      <div className="vector-card">
        
        <div className="card-illustration">
          <div className="card-title-wrapper">
            <h1 className="game-title">
              <span className='title-top'>TANK</span>
              <span className='title-main'>BATTLE</span>  
            </h1>
            <p className="vector-subtitle">Choose your destiny</p>
          </div>
        </div>

        <div className="card-body">
          <div className="avatar-icon-wrapper">
            <div className="chevron-down"></div>
          </div>
          
          <h2 className="body-title">USER LOGIN</h2>

          <div className="auth-buttons">
            <Link href="/signin" className="auth-btn signin-btn">
              <span className="btn-title"></span>SIGN IN
            </Link>

            <Link href="/signup" className="auth-btn signup-btn">
              <span className="btn-title"></span>SIGN UP
            </Link>
          </div>
        </div>
      </div>

      <footer className="vector-footer">
        <p>
          <Link href="/privacy">Privacy Policy</Link>
          {' · '}
          <Link href="/terms">Terms of Service</Link>
        </p>
        <p>&copy; 2026 Tank Battle Corp. All rights reserved.</p>
      </footer>
    </div>
  );
}
