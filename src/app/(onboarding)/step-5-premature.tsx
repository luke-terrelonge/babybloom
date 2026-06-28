import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'

const WEEKS = Array.from({ length: 13 }, (_, i) => 24 + i) // 24–36

export default function Step5PrematureScreen() {
  const { returnToSummary } = useLocalSearchParams<{ returnToSummary?: string }>()
  const { isPremature: savedPremature, gestationalWeeks: savedWeeks, update } = useOnboardingStore()
  const [isPremature, setIsPremature] = useState(savedPremature)
  const [gestationalWeeks, setGestationalWeeks] = useState(savedWeeks)

  function onContinue() {
    update({ isPremature, gestationalWeeks: isPremature ? gestationalWeeks : 40 })
    if (returnToSummary === 'true') {
      router.replace('/(onboarding)/step-6-summary')
    } else {
      router.push('/(onboarding)/step-6-summary')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={5} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Was your baby born early?</Text>
        <Text style={styles.sub}>
          If your baby was premature, we calculate a "corrected age" for more accurate suggestions.
        </Text>

        {/* Yes / No toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setIsPremature(false)}
            style={[styles.toggleBtn, !isPremature && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleLabel, !isPremature && styles.toggleLabelActive]}>No</Text>
          </Pressable>
          <Pressable
            onPress={() => setIsPremature(true)}
            style={[styles.toggleBtn, isPremature && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleLabel, isPremature && styles.toggleLabelActive]}>Yes</Text>
          </Pressable>
        </View>

        {isPremature && (
          <View style={styles.weeksSection}>
            <Text style={styles.weeksLabel}>Gestational age at birth</Text>
            <View style={styles.weeksGrid}>
              {WEEKS.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setGestationalWeeks(w)}
                  style={[styles.weekBtn, gestationalWeeks === w && styles.weekBtnActive]}
                >
                  <Text style={[styles.weekNum, gestationalWeeks === w && styles.weekNumActive]}>
                    {w}
                  </Text>
                  <Text style={[styles.weekText, gestationalWeeks === w && styles.weekTextActive]}>
                    wks
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What is corrected age?</Text>
              <Text style={styles.infoText}>
                Corrected age counts from your baby's original due date, not their birth date.
                For example, a baby born 6 weeks early at 3 months old has a corrected age of about 6 weeks.
                We use this for sleep and feeding suggestions.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.spacer} />
        <Button mode="contained" onPress={onContinue} contentStyle={styles.btnContent} style={styles.btn}>
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
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  toggleBtnActive: { borderColor: '#4DB6AC', backgroundColor: '#E0F2F1' },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  toggleLabelActive: { color: '#00796B' },
  weeksSection: { gap: 12 },
  weeksLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  weeksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekBtn: {
    width: 56, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  weekBtnActive: { borderColor: '#4DB6AC', backgroundColor: '#E0F2F1' },
  weekNum: { fontSize: 15, fontWeight: '700', color: '#374151' },
  weekNumActive: { color: '#00796B' },
  weekText: { fontSize: 10, color: '#9CA3AF' },
  weekTextActive: { color: '#4DB6AC' },
  infoBox: {
    backgroundColor: '#F0FAFA', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#4DB6AC',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#00796B', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  spacer: { flex: 1, minHeight: 32 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
})
