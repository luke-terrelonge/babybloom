import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'
import type { FeedingPreference } from '@/types'

const OPTIONS: { value: FeedingPreference; emoji: string; title: string; desc: string }[] = [
  {
    value: 'breast',
    emoji: '🤱',
    title: 'Breastfeeding',
    desc: 'Feeding directly from the breast or expressing milk.',
  },
  {
    value: 'formula',
    emoji: '🍼',
    title: 'Formula',
    desc: 'Using infant formula as the main source of nutrition.',
  },
  {
    value: 'mixed',
    emoji: '✨',
    title: 'Mixed feeding',
    desc: 'Combining breast milk and formula.',
  },
]

export default function Step4FeedingScreen() {
  const { returnToSummary } = useLocalSearchParams<{ returnToSummary?: string }>()
  const { feedingPreference: saved, update } = useOnboardingStore()
  const [selected, setSelected] = useState<FeedingPreference | null>(saved)
  const [showError, setShowError] = useState(false)

  function onContinue() {
    if (!selected) { setShowError(true); return }
    update({ feedingPreference: selected })
    if (returnToSummary === 'true') {
      router.replace('/(onboarding)/step-6-summary')
    } else {
      router.push('/(onboarding)/step-5-premature')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={4} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>How do you feed your baby?</Text>
        <Text style={styles.sub}>We use this to personalise feeding suggestions.</Text>

        <View style={styles.cards}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => { setSelected(opt.value); setShowError(false) }}
                style={[styles.card, active && styles.cardActive]}
              >
                <View style={[styles.cardIcon, active && styles.cardIconActive]}>
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>{opt.title}</Text>
                  <Text style={styles.cardDesc}>{opt.desc}</Text>
                </View>
                {active && <Text style={styles.check}>✓</Text>}
              </Pressable>
            )
          })}
        </View>

        {showError && <Text style={styles.error}>Please select a feeding method</Text>}

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
  cards: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  cardActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  cardIcon: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  cardIconActive: { backgroundColor: '#E0F2F1' },
  emoji: { fontSize: 26 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  cardTitleActive: { color: '#00796B' },
  cardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  check: { fontSize: 18, color: '#4DB6AC', fontWeight: '700' },
  error: { fontSize: 13, color: '#EF4444', marginTop: 8 },
  spacer: { flex: 1, minHeight: 32 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
})
