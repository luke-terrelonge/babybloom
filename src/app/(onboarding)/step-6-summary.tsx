import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ActivityIndicator } from 'react-native-paper'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'
import { supabase } from '@/lib/supabase'
import { gramsToLbsOz } from '@/lib/utils'

const FEEDING_LABELS: Record<string, string> = {
  breast: 'Breastfeeding',
  formula: 'Formula',
  mixed: 'Mixed feeding',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Boy',
  female: 'Girl',
  other: 'Other',
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Pressable onPress={onEdit}>
        <Text style={styles.editLink}>Edit</Text>
      </Pressable>
    </View>
  )
}

export default function Step6SummaryScreen() {
  const [saving, setSaving] = useState(false)
  const data = useOnboardingStore()
  const { user, setProfile } = useAuthStore()
  const { setActiveBaby, setBabies, setMembers } = useBabyStore()

  const weightLabel = data.birthWeightG
    ? (() => {
        const { lbs, oz } = gramsToLbsOz(data.birthWeightG)
        return `${data.birthWeightG}g (${lbs} lbs ${oz} oz)`
      })()
    : 'Not entered'

  const lengthLabel = data.birthLengthCm ? `${data.birthLengthCm} cm` : 'Not entered'

  async function onLooksGood() {
    if (!user) return
    const { data: { session } } = await supabase.auth.getSession()
    console.log('[step-6] zustand user:', user?.id, '| supabase session:', session?.user?.id ?? 'NULL')
    setSaving(true)
    try {
      // Update profile display name (avatar upload deferred — requires storage setup)
      await supabase.from('profiles').update({ display_name: data.displayName }).eq('id', user.id)

      // Insert baby
      const { data: baby, error: babyErr } = await supabase
        .from('babies')
        .insert({
          name: data.babyName,
          birthdate: format(data.birthdate, 'yyyy-MM-dd'),
          gender: data.gender,
          birth_weight_g: data.birthWeightG,
          birth_length_cm: data.birthLengthCm,
          feeding_preference: data.feedingPreference,
          is_premature: data.isPremature,
          gestational_weeks: data.isPremature ? data.gestationalWeeks : null,
        })
        .select()
        .single()

      if (babyErr || !baby) throw babyErr ?? new Error('Failed to create baby')

      // Insert parent membership
      const { data: member, error: memberErr } = await supabase
        .from('baby_members')
        .insert({ baby_id: baby.id, user_id: user.id, role: 'parent' })
        .select()
        .single()

      if (memberErr) throw memberErr

      // Update local stores
      setActiveBaby(baby)
      setBabies([baby])
      setMembers([member])

      router.push('/(onboarding)/step-7-plan')
    } catch (e: any) {
      console.error('[step-6] onLooksGood error:', e)
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (saving) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4DB6AC" />
          <Text style={styles.loadingText}>Saving your details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={6} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Everything look right?</Text>
        <Text style={styles.sub}>Review your details before we get started.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your profile</Text>
          <Row
            label="Name"
            value={data.displayName || 'Not set'}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-1-profile', params: { returnToSummary: 'true' } })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Baby details</Text>
          <Row
            label="Name"
            value={data.babyName || 'Not set'}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-2-baby-name', params: { returnToSummary: 'true' } })}
          />
          <Row
            label="Date of birth"
            value={format(data.birthdate, 'MMMM d, yyyy')}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-2-baby-name', params: { returnToSummary: 'true' } })}
          />
          <Row
            label="Gender"
            value={data.gender ? GENDER_LABELS[data.gender] : 'Not set'}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-2-baby-name', params: { returnToSummary: 'true' } })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Birth stats</Text>
          <Row
            label="Weight"
            value={weightLabel}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-3-birth-stats', params: { returnToSummary: 'true' } })}
          />
          <Row
            label="Length"
            value={lengthLabel}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-3-birth-stats', params: { returnToSummary: 'true' } })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feeding</Text>
          <Row
            label="Feeding method"
            value={data.feedingPreference ? FEEDING_LABELS[data.feedingPreference] : 'Not set'}
            onEdit={() => router.push({ pathname: '/(onboarding)/step-4-feeding', params: { returnToSummary: 'true' } })}
          />
        </View>

        {data.isPremature && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prematurity</Text>
            <Row
              label="Gestational age"
              value={`${data.gestationalWeeks} weeks`}
              onEdit={() => router.push({ pathname: '/(onboarding)/step-5-premature', params: { returnToSummary: 'true' } })}
            />
          </View>
        )}

        <Button
          mode="contained"
          onPress={onLooksGood}
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          Looks good! Continue
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
  card: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  editLink: { fontSize: 14, color: '#4DB6AC', fontWeight: '600', paddingLeft: 12 },
  btn: { borderRadius: 12, marginTop: 8 },
  btnContent: { height: 50 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#6B7280' },
})
