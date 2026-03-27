'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
       setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
       setError('Password must be at least 6 characters');
      return;
    }

    setLoading(false);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error during registration');
      }

      router.push('/signin?registered=true');

    } catch (err: any) {
      console.log('Signup data:', formData);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    return (
    <div className="landing-container">
      <div className='landing-background'></div>
      <Link href="/" className="back-button">
        ← BACK
      </Link>
      <div className="vector-card">
        <div className="card-illustration">
          <div className='card-title-wrapper'>
            <h1 className="vector-title">INSCRIPTION</h1>
          </div>
        </div>
        <div className='card-body'>
          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label htmlFor="username" className="form-label"> Pseudo</label>
              <input
                type="text"
                id="username"
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="TANKER_90"
                required
                pattern="[A-Za-z0-9_]{3,20}"
                title="3-20 caractères, lettres, chiffres et _"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="tanker@retro.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="signup-gg"> Confirm</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'CHARGEMENT...' : 'CREATE'}
            </button>

            <p className="legal-consent">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="auth-link">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="auth-link">Privacy Policy</Link>.
            </p>
          </form>

          <div className="auth-footer">
            <p >already have an account?</p>
            <Link href="/signin" className="auth-link">
              login
            </Link>
          </div>
        </div>
        </div>
    </div>
  );
}
