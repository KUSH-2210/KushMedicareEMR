import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Clinic, Profile } from '../../lib/database.types'

export interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  clinic: Clinic | null
  loading: boolean
  error: string | null
  configured: boolean
  refreshMembership: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
