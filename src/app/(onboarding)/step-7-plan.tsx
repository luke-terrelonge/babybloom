import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ActivityIndicator } from 'react-native-paper'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'
import { supabase } from '@/lib/supabase'

interface PlanCard {
  id: 'free' | 'premium' | 'family'
  name: string
  price: string
  badge?: string
  features: string[]
  cta: string
  highlighted: boolean
}

const PLANS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: [
      '1 baby tracked',
      '1 parent + 1 carer',
      'Basic sleep & feeding suggestions',
      '5 voice logs per day',
    ],
    cta: 'Continue free',
    highlighted: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99/mo',
    badge: '7-day free trial',
    features: [
      '1 baby tracked',
      'Up to 4 carers',
      'Full suggestions (all categories)',
      'Unlimited voice logs',
      'Growth percentile charts',
      'Push notifications',
      'Milestone tracker',
      'Data export (CSV/PDF)',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    id: 'family',
    name: 'Family',
    price: '$19.99/mo',
    badge: '7-day free trial',
    features: [
      'Unlimited babies',
      'Unlimited carers',
      'Everything in Premium',
      'Multi-baby switcher',
      'Family activity feed',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
]

export default function Step7PlanScreen() {
  const [selected, setSelected] = useState<'free' | 'premium' | 'family'>('free')
  const [loading, setLoading] = useState(false)
  const { user, profile, setProfile } = useAuthStore()
  const { setSubscription } = useSubscriptionStore()
  const { reset: resetOnboarding } = useOnboardingStore()

  async function completeFree() {
    if (!user) return
    setLoading(true)
    try {
      // Insert free subscription row
      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        plan: 'free',
        status: 'active',
      })

      // Mark onboarding complete
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id)

      // Update auth store so AuthGuard routes to main
      setProfile({ ...profile!, onboarding_complete: true })
      setSubscription({ id: '', user_id: user.id, plan: 'free', status: 'active', trial_ends_at: null, renews_at: null, revenuecat_customer_id: null, updated_at: new Date().toISOString() })
      resetOnboarding()

      router.replace('/(main)/home')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function completePaid(plan: 'premium' | 'family') {
    // RevenueCat integration goes here (Phase 4 of billing setup)
    // For now gracefully fall back to free plan with an info message
    Alert.alert(
      'Billing coming soon',
      'In-app purchases will be available after store submission. You will be on the free plan for now.',
      [{ text: 'Continue free', onPress: completeFree }]
    )
  }

  function onSelectPlan() {
    if (selected === 'free') return completeFree()
    return completePaid(selected)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4DB6AC" />
          <Text style={styles.loadingText}>Setting up your account...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader step={7} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Choose your plan</Text>
        <Text style={styles.sub}>You can change or cancel anytime.</Text>

        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const active = selected === plan.id
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                style={[styles.planCard, active && styles.planCardActive, plan.highlighted && styles.planCardHighlighted]}
              >
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, active && styles.planNameActive]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, active && styles.planPriceActive]}>{plan.price}</Text>
                </View>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {active && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>

        <Button
          mode="contained"
          onPress={onSelectPlan}
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          {PLANS.find((p) => p.id === selected)?.cta ?? 'Continue'}
        </Button>
        {selected !== 'free' && (
          <Button mode="text" onPress={completeFree} labelStyle={styles.skipLabel}>
            No thanks, continue free
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', marginBottom: 24, lineHeight: 22 },
  plans: { gap: 12, marginBottom: 20 },
  planCard: {
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 16, padding: 16, gap: 8,
  },
  planCardActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  planCardHighlighted: { borderColor: '#B2DFDB' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#F59E0B',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  planNameActive: { color: '#00796B' },
  planPrice: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  planPriceActive: { color: '#4DB6AC' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureCheck: { fontSize: 13, color: '#4DB6AC', fontWeight: '700', marginTop: 1 },
  featureText: { fontSize: 13, color: '#4B5563', flex: 1, lineHeight: 18 },
  selectedBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E0F2F1',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  selectedBadgeText: { fontSize: 11, fontWeight: '700', color: '#00796B' },
  btn: { borderRadius: 12 },
  btnContent: { height: 50 },
  skipLabel: { fontSize: 13, color: '#9CA3AF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#6B7280' },
})
