import type { Session } from '@supabase/supabase-js'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getErrorMessage } from '../../lib/errors'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { AuthContext, type AuthState } from './auth-context'
import type { Clinic, Profile } from '../../lib/database.types'

async function loadMembership(userId: string) {
  if (!supabase) {
    return { profile: null, clinic: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Your account is not assigned to a clinic. Contact an administrator.')
  }

  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', profile.clinic_id)
    .single()

  if (clinicError) {
    throw new Error('Your clinic could not be loaded. Contact an administrator.')
  }

  return { profile, clinic }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const hydrateSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    setProfile(null)
    setClinic(null)
    setError(null)

    if (!nextSession) {
      setLoading(false)
      return
    }

    try {
      const membership = await loadMembership(nextSession.user.id)
      setProfile(membership.profile)
      setClinic(membership.clinic)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to load your clinic account.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        void hydrateSession(data.session)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        void hydrateSession(nextSession)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [hydrateSession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      throw signInError
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      throw signOutError
    }
  }, [])

  const refreshMembership = useCallback(async () => {
    if (!session) return
    const membership = await loadMembership(session.user.id)
    setProfile(membership.profile)
    setClinic(membership.clinic)
  }, [session])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      clinic,
      loading,
      error,
      configured: isSupabaseConfigured,
      refreshMembership,
      signIn,
      signOut,
    }),
    [session, profile, clinic, loading, error, refreshMembership, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
