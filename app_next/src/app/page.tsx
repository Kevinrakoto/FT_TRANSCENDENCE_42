'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-background"></div>
      
      {/* Contenu principal */}
      <div className="landing-content">
        {/* Logo/Titre */}
        <header className="landing-header">
          <h1 className="landing-title">
            <span className="title-top">TANK</span>
            <span className="title-main">BATTLE</span>
          </h1>
          <p className="landing-subtitle">
            Enter the battlefield. Choose your destiny.
          </p>
        </header>

        <div className="auth-buttons">
          <Link href="/signin" className="auth-btn signin-btn">
            <span className="btn-content">
              <span className="btn-title">SIGN IN</span>
              <span className="btn-subtitle">Already have an account</span>
            </span>
          </Link>

          <Link href="/signup" className="auth-btn signup-btn">
            <span className="btn-icon"></span>
            <span className="btn-content">
              <span className="btn-title">SIGN UP</span>
              <span className="btn-subtitle">Create a new account</span>
            </span>
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 Tank Battle Corp. All rights reserved.</p>
      </footer>
    </div>
  );
}