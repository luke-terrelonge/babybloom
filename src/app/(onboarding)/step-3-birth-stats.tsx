import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, SegmentedButtons, TextInput } from 'react-native-paper'
import { router, useLocalSearchParams } from 'expo-router'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'
import { gramsToLbsOz, lbsOzToGrams, cmToInches, inchesToCm } from '@/lib/utils'

type WeightUnit = 'metric' | 'imperial'
type LengthUnit = 'cm' | 'in'

export default function Step3BirthStatsScreen() {
  const { returnToSummary } = useLocalSearchParams<{ returnToSummary?: string }>()
  const { birthWeightG: savedWeightG, birthLengthCm: savedLengthCm, update } = useOnboardingStore()

  const [weightUnit, setWeightUnit] = useState<WeightUnit>('metric')
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('cm')

  // Metric weight
  const [weightG, setWeightG] = useState(savedWeightG ? String(savedWeightG) : '')
  // Imperial weight
  const initLbsOz = savedWeightG ? gramsToLbsOz(savedWeightG) : { lbs: 0, oz: 0 }
  const [weightLbs, setWeightLbs] = useState(savedWeightG ? String(initLbsOz.lbs) : '')
  const [weightOz, setWeightOz] = useState(savedWeightG ? String(initLbsOz.oz) : '')

  // Metric length
  const [lengthCm, setLengthCm] = useState(savedLengthCm ? String(savedLengthCm) : '')
  // Imperial length
  const [lengthIn, setLengthIn] = useState(savedLengthCm ? String(cmToInches(savedLengthCm)) : '')

  function switchWeightUnit(unit: string) {
    const u = unit as WeightUnit
    if (u === 'imperial' && weightG) {
      const g = parseFloat(weightG)
      if (!isNaN(g)) {
        const { lbs, oz } = gramsToLbsOz(g)
        setWeightLbs(String(lbs))
        setWeightOz(String(oz))
      }
    } else if (u === 'metric' && (weightLbs || weightOz)) {
      const l = parseFloat(weightLbs) || 0
      const o = parseFloat(weightOz) || 0
      setWeightG(String(lbsOzToGrams(l, o)))
    }
    setWeightUnit(u)
  }

  function switchLengthUnit(unit: string) {
    const u = unit as LengthUnit
    if (u === 'in' && lengthCm) {
      const cm = parseFloat(lengthCm)
      if (!isNaN(cm)) setLengthIn(String(cmToInches(cm)))
    } else if (u === 'cm' && lengthIn) {
      const i = parseFloat(lengthIn)
      if (!isNaN(i)) setLengthCm(String(inchesToCm(i)))
    }
    setLengthUnit(u)
  }

  function onContinue() {
    let finalWeightG: number | null = null
    let finalLengthCm: number | null = null

    if (weightUnit === 'metric' && weightG) {
      finalWeightG = parseFloat(weightG) || null
    } else if (weightUnit === 'imperial' && (weightLbs || weightOz)) {
      finalWeightG = lbsOzToGrams(parseFloat(weightLbs) || 0, parseFloat(weightOz) || 0)
    }

    if (lengthUnit === 'cm' && lengthCm) {
      finalLengthCm = parseFloat(lengthCm) || null
    } else if (lengthUnit === 'in' && lengthIn) {
      finalLengthCm = inchesToCm(parseFloat(lengthIn) || 0)
    }

    update({ birthWeightG: finalWeightG, birthLengthCm: finalLengthCm })
    if (returnToSummary === 'true') {
      router.replace('/(onboarding)/step-6-summary')
    } else {
      router.push('/(onboarding)/step-4-feeding')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={3} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Birth measurements</Text>
        <Text style={styles.sub}>These help us calculate accurate growth percentiles. You can skip this.</Text>

        {/* Weight */}
        <Text style={styles.sectionLabel}>Birth weight</Text>
        <SegmentedButtons
          value={weightUnit}
          onValueChange={switchWeightUnit}
          buttons={[
            { value: 'metric', label: 'g / kg' },
            { value: 'imperial', label: 'lbs / oz' },
          ]}
          style={styles.segmented}
        />
        {weightUnit === 'metric' ? (
          <TextInput
            label="Weight (g)"
            value={weightG}
            onChangeText={setWeightG}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder="e.g. 3200"
          />
        ) : (
          <View style={styles.row}>
            <TextInput
              label="lbs"
              value={weightLbs}
              onChangeText={setWeightLbs}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label="oz"
              value={weightOz}
              onChangeText={setWeightOz}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
          </View>
        )}

        {/* Length */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Birth length</Text>
        <SegmentedButtons
          value={lengthUnit}
          onValueChange={switchLengthUnit}
          buttons={[
            { value: 'cm', label: 'cm' },
            { value: 'in', label: 'inches' },
          ]}
          style={styles.segmented}
        />
        {lengthUnit === 'cm' ? (
          <TextInput
            label="Length (cm)"
            value={lengthCm}
            onChangeText={setLengthCm}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder="e.g. 50"
          />
        ) : (
          <TextInput
            label="Length (inches)"
            value={lengthIn}
            onChangeText={setLengthIn}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            placeholder="e.g. 19.5"
          />
        )}

        <View style={styles.spacer} />
        <Button mode="text" onPress={onContinue} style={styles.skipBtn} labelStyle={styles.skipLabel}>
          Skip for now
        </Button>
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
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  segmented: { marginBottom: 12 },
  input: { backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  spacer: { flex: 1, minHeight: 24 },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
  skipBtn: { marginBottom: 8 },
  skipLabel: { color: '#9CA3AF' },
})
