'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-background"></div>

      <div className="vector-card">
        
        <div className="card-illustration">
          <div className="card-title-wrapper">
            <h1 className="vector-title">TANK BATTLE</h1>
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
        <p>&copy; 2026 Tank Battle Corp. All rights reserved.</p>
      </footer>
    </div>
  );
}
