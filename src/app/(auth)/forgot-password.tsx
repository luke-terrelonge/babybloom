import { useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, HelperText, TextInput } from 'react-native-paper'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [resending, setResending] = useState(false)

  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'babybloom://reset-password',
    })
    if (!error) {
      setSentEmail(data.email)
      setSent(true)
    }
  }

  async function handleResend() {
    setResending(true)
    await supabase.auth.resetPasswordForEmail(sentEmail, {
      redirectTo: 'babybloom://reset-password',
    })
    setResending(false)
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.sentContainer}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <View style={styles.sentIcon}>
            <Text style={styles.sentEmoji}>📬</Text>
          </View>
          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.sentSub}>
            We sent a password reset link to{'\n'}
            <Text style={styles.email}>{sentEmail}</Text>
          </Text>
          <Text style={styles.note}>
            Didn't receive it? Check your spam folder or tap below to resend.
          </Text>
          <Button
            mode="outlined"
            onPress={handleResend}
            loading={resending}
            disabled={resending}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Resend email
          </Button>
          <Button mode="text" onPress={() => router.replace('/(auth)/sign-in')}>
            Back to sign in
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <Text style={styles.heading}>Forgot password?</Text>
          <Text style={styles.sub}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <>
                <TextInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  mode="outlined"
                  error={!!errors.email}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email?.message}
                </HelperText>
              </>
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
            contentStyle={styles.btnContent}
            style={styles.btn}
          >
            Send reset link
          </Button>

          <Button mode="text" onPress={() => router.back()} style={styles.cancelBtn}>
            Cancel
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  back: { paddingVertical: 16, paddingRight: 16, alignSelf: 'flex-start' },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },
  input: { backgroundColor: '#ffffff' },
  btn: { borderRadius: 12, marginTop: 12 },
  btnContent: { height: 50 },
  cancelBtn: { marginTop: 4 },
  sentContainer: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  sentEmoji: { fontSize: 40 },
  sentSub: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 16, marginTop: 8 },
  email: { color: '#1A1A1A', fontWeight: '600' },
  note: { fontSize: 14, color: '#9CA3AF', marginBottom: 28, lineHeight: 20 },
})
