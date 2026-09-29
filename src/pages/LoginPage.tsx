import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { getErrorMessage } from '../lib/errors'
import { useAuth } from '../features/auth/useAuth'

export function LoginPage() {
  const { configured, session, profile, loading, error: accountError, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  if (session && profile && !loading) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Sign in failed. Check your details and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetSession = async () => {
    setError(null)
    try {
      await signOut()
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not reset the session. Please refresh and try again.'))
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand brand--light">
          <span className="brand__mark" aria-hidden="true"><i>K</i><b>+</b></span>
          <div><strong>Kush<span>Medicare</span></strong><small>ClinicOS</small></div>
        </div>
        <div className="login-intro__copy">
          <span className="eyebrow"><i aria-hidden="true" /> Clinical intelligence workspace</span>
          <h1>Care, connected<br />at every step.</h1>
          <p>A fast, private workspace built for pediatric and dental care.</p>
          <div className="login-features" aria-label="Workspace features"><span>Patient-first</span><span>Tap-fast workflow</span><span>Secure records</span></div>
        </div>
        <p className="privacy-note"><span aria-hidden="true" /> Protected access · Clinic-scoped records</p>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your clinic</h2>
            <p>Use the account provided by your clinic administrator.</p>
          </div>

          {!configured && (
            <Alert>Supabase is not configured. Add the values from <code>.env.example</code> to <code>.env.local</code>.</Alert>
          )}
          {(error || accountError) && <Alert>{error ?? accountError}</Alert>}

          <label>
            <span>Email address</span>
            <input type="email" name="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="button button--primary button--large" type="submit" disabled={!configured || submitting || loading || Boolean(session && !profile)}>
            {submitting || loading ? 'Signing in…' : 'Sign in securely'}
          </button>
          {session && !profile && accountError ? (
            <button className="button button--secondary button--large" type="button" onClick={() => void handleResetSession()}>
              Sign out and try another account
            </button>
          ) : null}
          <p className="form-footnote">Access is limited to authorized doctor and staff accounts.</p>
        </form>
      </section>
    </main>
  )
}
