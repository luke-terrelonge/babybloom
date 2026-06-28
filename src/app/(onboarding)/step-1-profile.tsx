import { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, HelperText, TextInput } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'

const schema = z.object({
  displayName: z.string().min(2, 'Enter your name (at least 2 characters)'),
})
type FormData = z.infer<typeof schema>

export default function Step1ProfileScreen() {
  const { returnToSummary } = useLocalSearchParams<{ returnToSummary?: string }>()
  const { displayName: savedName, avatarUri: savedAvatar, update } = useOnboardingStore()
  const { profile } = useAuthStore()
  const [avatarUri, setAvatarUri] = useState<string | null>(savedAvatar)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: savedName || profile?.display_name || '' },
  })

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri)
  }

  function onSubmit(data: FormData) {
    update({ displayName: data.displayName, avatarUri })
    if (returnToSummary === 'true') {
      router.replace('/(onboarding)/step-6-summary')
    } else {
      router.push('/(onboarding)/step-2-baby-name')
    }
  }

  const initials = (savedName || profile?.display_name || 'Y')[0].toUpperCase()

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={1} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Tell us about yourself</Text>
        <Text style={styles.sub}>Your profile helps family identify you in the app.</Text>

        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarBg}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#ffffff" />
          </View>
        </Pressable>
        <Text style={styles.avatarHint}>Tap to add a photo (optional)</Text>

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

        <View style={styles.spacer} />
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          {returnToSummary === 'true' ? 'Save changes' : 'Continue'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  avatarWrap: { alignSelf: 'center', marginBottom: 8, position: 'relative', width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 36, fontWeight: '600', color: '#00796B' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4DB6AC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ffffff',
  },
  avatarHint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 28 },
  input: { backgroundColor: '#ffffff' },
  spacer: { flex: 1, minHeight: 32 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
})
