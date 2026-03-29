'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams?.get('registered') === 'true'
  const queryError = searchParams?.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(queryError === 'already_connected' ? 'This account is already logged in from another session.' : '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      router.push('/dashboard/me')

    } catch (err: any) {
      setError(err.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-container">
      <div className="landing-background"></div>
      <Link href="/" className="back-button">
        ← BACK
      </Link>
      <div className="vector-card">
        <div className="card-illustration">
          <div className='card-title-wrapper'>
           <h1 className="vector-title"> CONNEXION</h1>

              {registered && (
                <div className="success-message">
                   Account created successfully! Please log in.
                </div>
             )}
             </div>
             </div>
             <div className='card-body'>
              <form onSubmit={handleSubmit}>
                {/* <div className="form-grid"> */}
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tanker@retro.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                {/* </div> */}

                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="form-actions">
                  <button type="submit" className="submit-button-si" disabled={loading}>
                    {loading ? 'CONNEXION...' : 'LOG IN'}
                  </button>

                  <Link href="/signup" className="menu-item">
                     NOT YET REGISTERED?
                  </Link>
                </div>
              </form>
              </div>

      </div>
    </div>
    )
  }
