import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useBabyStore } from '@/stores/babyStore'
import { useAuthStore } from '@/stores/authStore'
import type { FeedingPreference } from '@/types'

const FEEDING_OPTIONS: { value: FeedingPreference; emoji: string; label: string }[] = [
  { value: 'breast', emoji: '🤱', label: 'Breastfeeding' },
  { value: 'formula', emoji: '🍼', label: 'Formula' },
  { value: 'mixed', emoji: '✨', label: 'Mixed' },
]

export default function BabyProfileScreen() {
  const router = useRouter()
  const { activeBaby, setActiveBaby, members } = useBabyStore()
  const { user } = useAuthStore()

  const isParent = members.find((m) => m.user_id === user?.id)?.role === 'parent'

  const [name, setName] = useState(activeBaby?.name ?? '')
  const [feedingPref, setFeedingPref] = useState<FeedingPreference>(activeBaby?.feeding_preference ?? 'mixed')
  const [saving, setSaving] = useState(false)

  if (!activeBaby) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={s.title}>Baby Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}><Text style={s.empty}>No baby found.</Text></View>
      </SafeAreaView>
    )
  }

  async function handleSave() {
    if (!activeBaby || !isParent) return
    if (!name.trim()) { Alert.alert('Name required'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('babies')
        .update({ name: name.trim(), feeding_preference: feedingPref })
        .eq('id', activeBaby.id)
        .select()
        .single()
      if (error) throw error
      setActiveBaby(data)
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={s.title}>Baby Profile</Text>
        {isParent ? (
          <Pressable onPress={handleSave} style={s.saveHeaderBtn} disabled={saving}>
            <Text style={s.saveHeaderText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Avatar placeholder */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(activeBaby.name || '?')[0].toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.label}>Baby name</Text>
        {isParent ? (
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Baby name"
            placeholderTextColor="#9CA3AF"
          />
        ) : (
          <Text style={s.readOnly}>{activeBaby.name}</Text>
        )}

        <Text style={s.label}>Date of birth</Text>
        <Text style={s.readOnly}>{format(parseISO(activeBaby.birthdate), 'MMMM d, yyyy')}</Text>

        <Text style={s.label}>Gender</Text>
        <Text style={s.readOnly}>{activeBaby.gender.charAt(0).toUpperCase() + activeBaby.gender.slice(1)}</Text>

        {activeBaby.is_premature && (
          <>
            <Text style={s.label}>Gestational age at birth</Text>
            <Text style={s.readOnly}>{activeBaby.gestational_weeks} weeks</Text>
          </>
        )}

        <Text style={s.label}>Feeding preference</Text>
        {isParent ? (
          <View style={s.feedingRow}>
            {FEEDING_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[s.feedingCard, feedingPref === opt.value && s.feedingCardActive]}
                onPress={() => setFeedingPref(opt.value)}
              >
                <Text style={s.feedingEmoji}>{opt.emoji}</Text>
                <Text style={[s.feedingLabel, feedingPref === opt.value && s.feedingLabelActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={s.readOnly}>{FEEDING_OPTIONS.find((o) => o.value === activeBaby.feeding_preference)?.label ?? activeBaby.feeding_preference}</Text>
        )}

        {!isParent && (
          <View style={s.viewOnlyNote}>
            <Ionicons name="eye-outline" size={16} color="#9CA3AF" />
            <Text style={s.viewOnlyText}>Caregivers can view but not edit the baby profile.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  saveHeaderBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  saveHeaderText: { fontSize: 15, fontWeight: '600', color: '#4DB6AC' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, color: '#9CA3AF' },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4DB6AC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  readOnly: { fontSize: 16, color: '#1A1A1A', paddingVertical: 4 },
  feedingRow: { flexDirection: 'row', gap: 10 },
  feedingCard: { flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, alignItems: 'center' },
  feedingCardActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  feedingEmoji: { fontSize: 24, marginBottom: 4 },
  feedingLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  feedingLabelActive: { color: '#00796B' },
  viewOnlyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 },
  viewOnlyText: { fontSize: 13, color: '#9CA3AF', flex: 1 },
})
