import { useState } from 'react'
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, HelperText, TextInput } from 'react-native-paper'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type FormData = z.infer<typeof schema>

export default function ResetPasswordScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const { setPasswordRecovery, signOut } = useAuthStore()

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    setDone(true)
    setPasswordRecovery(false)
    await supabase.auth.signOut()
    signOut()
  }

  if (done) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.doneContainer}>
          <View style={styles.doneIcon}>
            <Text style={styles.doneEmoji}>✅</Text>
          </View>
          <Text style={styles.heading}>Password updated</Text>
          <Text style={styles.sub}>Your password has been changed successfully.</Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/sign-in')}
            contentStyle={styles.btnContent}
            style={styles.btn}
          >
            Sign in
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
          <Text style={styles.heading}>Set new password</Text>
          <Text style={styles.sub}>Choose a strong password for your account.</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <>
                  <TextInput
                    label="New password"
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
                    label="Confirm new password"
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

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting}
              contentStyle={styles.btnContent}
              style={styles.btn}
            >
              Update password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },
  form: { gap: 4 },
  input: { backgroundColor: '#ffffff' },
  btn: { borderRadius: 12, marginTop: 12 },
  btnContent: { height: 50 },
  doneContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 80, alignItems: 'center' },
  doneIcon: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#E0F2F1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  doneEmoji: { fontSize: 40 },
})
