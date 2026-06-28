import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleResend() {
    if (!email) return
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📧</Text>
        </View>

        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email ?? 'your email address'}</Text>
        </Text>
        <Text style={styles.note}>
          Click the link in the email to verify your account and get started.
        </Text>

        {resent && (
          <Text style={styles.resentBadge}>Email resent ✓</Text>
        )}

        <Button
          mode="outlined"
          onPress={handleResend}
          loading={resending}
          disabled={resending || resent}
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          Resend verification email
        </Button>

        <Button
          mode="text"
          onPress={() => router.replace('/(auth)/sign-in')}
          labelStyle={styles.backLabel}
        >
          Back to sign in
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 64, alignItems: 'center' },
  iconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: '#E0F2F1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  icon: { fontSize: 44 },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  email: { color: '#1A1A1A', fontWeight: '600' },
  note: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  resentBadge: { fontSize: 14, color: '#00796B', fontWeight: '500', marginBottom: 12 },
  btn: { borderRadius: 12, alignSelf: 'stretch' },
  btnContent: { height: 50 },
  backLabel: { color: '#6B7280', fontSize: 14 },
})
