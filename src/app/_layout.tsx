import '@/global.css'
import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { Stack, useRouter, useSegments } from 'expo-router'
import { PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { bloomTheme } from '@/lib/babybloom-theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

function AuthGuard() {
  const router = useRouter()
  const segments = useSegments() as string[]
  const {
    session,
    profile,
    loading,
    profileLoading,
    passwordRecovery,
    setSession,
    setProfile,
    setPasswordRecovery,
  } = useAuthStore()

  useEffect(() => {
    const handleUrl = async (url: string) => {
      await supabase.auth.exchangeCodeForSession(url)
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url)
    })

    const urlListener = Linking.addEventListener('url', ({ url }) => handleUrl(url))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true)
          setSession(newSession)
          return
        }

        setSession(newSession)

        if (newSession?.user) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single()

          if (existing) {
            setProfile(existing)
          } else {
            const meta = newSession.user.user_metadata
            const { data: created } = await supabase
              .from('profiles')
              .insert({
                id: newSession.user.id,
                display_name: meta?.full_name ?? meta?.name ?? null,
                units: 'metric',
                onboarding_complete: false,
              })
              .select()
              .single()
            setProfile(created ?? null)
          }
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      urlListener.remove()
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading || profileLoading) return

    if (passwordRecovery) {
      const inReset =
        segments[0] === '(auth)' && segments[1] === 'reset-password'
      if (!inReset) router.replace('/(auth)/reset-password')
      return
    }

    const inAuth = segments[0] === '(auth)'
    const inOnboarding = segments[0] === '(onboarding)'
    const inMain = segments[0] === '(main)' || segments[0] === 'log'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome')
    } else if (!profile?.onboarding_complete) {
      if (!inOnboarding) router.replace('/(onboarding)/step-1-profile')
    } else {
      if (!inMain) router.replace('/(main)/home')
    }
  }, [session, profile, loading, profileLoading, passwordRecovery, segments])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={bloomTheme}>
          <StatusBar style="dark" />
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
