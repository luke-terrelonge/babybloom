import { useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, HelperText, TextInput } from 'react-native-paper'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

const schema = z
  .object({
    displayName: z.string().min(2, 'Enter your name (at least 2 characters)'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine((v) => v, 'You must accept the terms to continue'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export default function SignUpScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  async function onSubmit(data: FormData) {
    setAuthError(null)
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { display_name: data.displayName } },
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    // Create profile row immediately for email sign-ups
    if (result.user) {
      await supabase.from('profiles').upsert({
        id: result.user.id,
        display_name: data.displayName,
        units: 'metric',
        onboarding_complete: false,
      })
    }
    // If no session yet, email confirmation required
    if (!result.session) {
      router.push({ pathname: '/(auth)/verify-email', params: { email: data.email } })
    }
    // If session exists, AuthGuard will navigate to onboarding
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

          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Start tracking your baby's journey</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value, onBlur } }) => (
                <>
                  <TextInput
                    label="Your name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="name"
                    mode="outlined"
                    error={!!errors.displayName}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.displayName}>
                    {errors.displayName?.message}
                  </HelperText>
                </>
              )}
            />

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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <>
                  <TextInput
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    mode="outlined"
                    error={!!errors.password}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword((v) => !v)}
                      />
                    }
                  />
                  <HelperText type="error" visible={!!errors.password}>
                    {errors.password?.message}
                  </HelperText>
                </>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value, onBlur } }) => (
                <>
                  <TextInput
                    label="Confirm password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showConfirm}
                    autoComplete="new-password"
                    mode="outlined"
                    error={!!errors.confirmPassword}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showConfirm ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirm((v) => !v)}
                      />
                    }
                  />
                  <HelperText type="error" visible={!!errors.confirmPassword}>
                    {errors.confirmPassword?.message}
                  </HelperText>
                </>
              )}
            />

            <Controller
              control={control}
              name="termsAccepted"
              render={({ field: { onChange, value } }) => (
                <Pressable
                  onPress={() => onChange(!value)}
                  style={styles.termsRow}
                >
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                    color="#4DB6AC"
                  />
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </Pressable>
              )}
            />
            {errors.termsAccepted && (
              <Text style={styles.errorText}>{errors.termsAccepted?.message}</Text>
            )}

            {authError && <Text style={styles.errorText}>{authError}</Text>}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
              contentStyle={styles.btnContent}
              style={styles.btn}
            >
              Create Account
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>
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
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 28 },
  form: { gap: 4 },
  input: { backgroundColor: '#ffffff' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  termsText: { flex: 1, fontSize: 14, color: '#6B7280', lineHeight: 20 },
  termsLink: { color: '#4DB6AC', fontWeight: '500' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 4 },
  btn: { borderRadius: 12, marginTop: 12 },
  btnContent: { height: 50 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, color: '#4DB6AC', fontWeight: '600' },
})
