import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import { useOnboardingStore } from '@/stores/onboardingStore'

function Row({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={s.row} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : '#4DB6AC'} style={s.rowIcon} />
      <Text style={[s.rowLabel, danger && s.danger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </Pressable>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { profile, signOut: clearAuth } = useAuthStore()
  const { setActiveBaby, setBabies, setMembers } = useBabyStore()
  const { clearLogs } = useLogsStore()
  const { reset: resetOnboarding } = useOnboardingStore()

  async function doSignOut() {
    await supabase.auth.signOut()
    clearAuth()
    setBabies([]); setActiveBaby(null); setMembers([])
    clearLogs()
    resetOnboarding()
  }

  async function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) await doSignOut()
      return
    }
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Settings</Text>

      <Text style={s.sectionHeader}>Account</Text>
      <View style={s.card}>
        <View style={s.accountRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(profile?.display_name ?? 'U')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.accountName}>{profile?.display_name ?? 'Your account'}</Text>
            <Text style={s.accountSub}>{profile?.units === 'imperial' ? 'Imperial units' : 'Metric units'}</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionHeader}>Baby</Text>
      <View style={s.card}>
        <Row icon="paw-outline" label="Baby profile" onPress={() => router.push('/(main)/baby-profile')} />
        <View style={s.divider} />
        <Row icon="bar-chart-outline" label="Growth tracker" onPress={() => router.push('/(main)/growth')} />
        <View style={s.divider} />
        <Row icon="list-outline" label="Activity history" onPress={() => router.push('/(main)/activity')} />
      </View>

      <Text style={s.sectionHeader}>Account</Text>
      <View style={s.card}>
        <Row icon="log-out-outline" label="Sign out" onPress={handleSignOut} danger />
      </View>

      <Text style={s.version}>BabyBloom v1.0.0</Text>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
  card: { marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  accountRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4DB6AC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  accountName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  accountSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  danger: { color: '#EF4444' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },
  version: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 32 },
})
