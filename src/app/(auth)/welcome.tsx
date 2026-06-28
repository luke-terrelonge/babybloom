import { useState } from 'react'
import { Alert, Platform, View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'react-native-paper'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function WelcomeScreen() {
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const redirectTo = makeRedirectUri({ scheme: 'babybloom' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) throw error ?? new Error('No URL returned')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success' && result.url) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
        if (sessionError) throw sessionError
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) return
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) throw error
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return
      Alert.alert('Sign in failed', e?.message ?? 'Please try again.')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🌸</Text>
        </View>
        <Text style={styles.appName}>BabyBloom</Text>
        <Text style={styles.tagline}>Track your baby{`'`}s journey{'\n'}with love and confidence</Text>
      </View>

      <View style={styles.actions}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleAppleSignIn}
          />
        )}
        <Button
          mode="outlined"
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          disabled={googleLoading}
          icon="google"
          contentStyle={styles.btnContent}
          style={styles.btn}
          labelStyle={styles.btnLabel}
        >
          Continue with Google
        </Button>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button
          mode="contained"
          onPress={() => router.push('/(auth)/sign-up')}
          contentStyle={styles.btnContent}
          style={styles.btn}
          labelStyle={styles.btnLabel}
        >
          Create Account
        </Button>
        <Button
          mode="text"
          onPress={() => router.push('/(auth)/sign-in')}
          labelStyle={styles.textBtnLabel}
        >
          I already have an account
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 36, fontWeight: '700', color: '#00796B', letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  appleBtn: { height: 50 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
  btnLabel: { fontSize: 15, letterSpacing: 0 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  textBtnLabel: { fontSize: 14, color: '#6B7280' },
})
