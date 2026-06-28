import { useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, HelperText, TextInput } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'
import type { Gender } from '@/types'

const schema = z.object({
  babyName: z.string().min(1, 'Enter your baby\'s name'),
})
type FormData = z.infer<typeof schema>

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Boy', value: 'male' },
  { label: 'Girl', value: 'female' },
  { label: 'Other', value: 'other' },
]

export default function Step2BabyNameScreen() {
  const { returnToSummary } = useLocalSearchParams<{ returnToSummary?: string }>()
  const { babyName: savedName, birthdate: savedDate, gender: savedGender, update } = useOnboardingStore()

  const [birthdate, setBirthdate] = useState<Date>(savedDate)
  const [gender, setGender] = useState<Gender | null>(savedGender)
  const [showPicker, setShowPicker] = useState(false)
  const [genderError, setGenderError] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { babyName: savedName },
  })

  function onSubmit(data: FormData) {
    if (!gender) { setGenderError(true); return }
    update({ babyName: data.babyName, birthdate, gender })
    if (returnToSummary === 'true') {
      router.replace('/(onboarding)/step-6-summary')
    } else {
      router.push('/(onboarding)/step-3-birth-stats')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={2} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>About your baby</Text>
        <Text style={styles.sub}>Let us get to know your little one.</Text>

        {/* Baby name */}
        <Controller
          control={control}
          name="babyName"
          render={({ field: { onChange, value, onBlur } }) => (
            <>
              <TextInput
                label="Baby's name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                mode="outlined"
                error={!!errors.babyName}
                style={styles.input}
              />
              <HelperText type="error" visible={!!errors.babyName}>
                {errors.babyName?.message}
              </HelperText>
            </>
          )}
        />

        {/* Date of birth */}
        <Text style={styles.fieldLabel}>Date of birth</Text>
        <Pressable onPress={() => setShowPicker(true)} style={styles.datePressable}>
          <Text style={styles.dateValue}>{format(birthdate, 'MMMM d, yyyy')}</Text>
          <Text style={styles.dateCaret}>›</Text>
        </Pressable>

        {/* iOS date picker modal */}
        {Platform.OS === 'ios' && (
          <Modal visible={showPicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Date of birth</Text>
                  <Pressable onPress={() => setShowPicker(false)}>
                    <Text style={styles.modalDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={birthdate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(_, d) => d && setBirthdate(d)}
                />
              </View>
            </View>
          </Modal>
        )}
        {/* Android date picker */}
        {Platform.OS === 'android' && showPicker && (
          <DateTimePicker
            value={birthdate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, d) => { setShowPicker(false); if (d) setBirthdate(d) }}
          />
        )}

        {/* Gender */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Gender</Text>
        <View style={styles.genderRow}>
          {GENDERS.map((g) => (
            <Pressable
              key={g.value}
              onPress={() => { setGender(g.value); setGenderError(false) }}
              style={[
                styles.genderBtn,
                gender === g.value && styles.genderBtnActive,
              ]}
            >
              <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {genderError && <Text style={styles.errorText}>Please select a gender</Text>}

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
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 24, lineHeight: 22 },
  input: { backgroundColor: '#ffffff' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 },
  datePressable: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dateValue: { fontSize: 16, color: '#1A1A1A' },
  dateCaret: { fontSize: 20, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  modalDone: { fontSize: 17, color: '#4DB6AC', fontWeight: '600' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  genderBtnActive: { borderColor: '#4DB6AC', backgroundColor: '#E0F2F1' },
  genderLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  genderLabelActive: { color: '#00796B', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 4 },
  spacer: { flex: 1, minHeight: 32 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
})
