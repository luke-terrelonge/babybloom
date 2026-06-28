import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  passwordRecovery: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setPasswordRecovery: (v: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  passwordRecovery: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      loading: false,
      profileLoading: session !== null,
    }),
  setProfile: (profile) => set({ profile, profileLoading: false }),
  setPasswordRecovery: (v) => set({ passwordRecovery: v }),
  signOut: () =>
    set({
      session: null,
      user: null,
      profile: null,
      loading: false,
      profileLoading: false,
      passwordRecovery: false,
    }),
}))
