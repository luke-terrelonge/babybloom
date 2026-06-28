import { useState } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useLogsStore } from '@/stores/logsStore'
import type { FeedingType, DiaperType, SleepType } from '@/types'

type LogKind = 'feeding' | 'sleep' | 'diaper'

interface Props {
  visible: boolean
  type: LogKind | null
  babyId: string
  onDismiss: () => void
  onSaved: () => void
}

const DIAPER_TYPES: { value: DiaperType; emoji: string; label: string }[] = [
  { value: 'wet', emoji: '💧', label: 'Wet' },
  { value: 'dirty', emoji: '💩', label: 'Dirty' },
  { value: 'both', emoji: '🔄', label: 'Both' },
]

const FEED_TYPES: { value: FeedingType; emoji: string; label: string }[] = [
  { value: 'breast_left', emoji: '🤱', label: 'Left' },
  { value: 'breast_right', emoji: '🤱', label: 'Right' },
  { value: 'bottle', emoji: '🍼', label: 'Bottle' },
  { value: 'solid', emoji: '🥣', label: 'Solid' },
]

export default function QuickLogSheet({ visible, type, babyId, onDismiss, onSaved }: Props) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { addFeedingLog, addSleepLog, addDiaperLog } = useLogsStore()

  const [diaperType, setDiaperType] = useState<DiaperType>('wet')
  const [feedType, setFeedType] = useState<FeedingType>('bottle')
  const [amount, setAmount] = useState('')
  const [sleepType, setSleepType] = useState<SleepType>('nap')
  const [saving, setSaving] = useState(false)

  const titles: Record<LogKind, string> = { feeding: '🍼 Quick feed', sleep: '😴 Quick sleep', diaper: '🚼 Diaper change' }

  function fullFormPath(): string {
    if (type === 'feeding') return '/log/feeding'
    if (type === 'sleep') return '/log/sleep'
    return '/log/diaper'
  }

  async function handleSave() {
    if (!user || !babyId || !type) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      if (type === 'diaper') {
        const { data, error } = await supabase.from('diaper_logs').insert({ baby_id: babyId, logged_by: user.id, diaper_type: diaperType, changed_at: now, notes: null, source: 'manual' as const }).select().single()
        if (error) throw error
        addDiaperLog(data)
      } else if (type === 'sleep') {
        const { data, error } = await supabase.from('sleep_logs').insert({ baby_id: babyId, logged_by: user.id, sleep_type: sleepType, started_at: now, ended_at: null, notes: null, source: 'manual' as const }).select().single()
        if (error) throw error
        addSleepLog(data)
      } else {
        const isBreast = feedType === 'breast_left' || feedType === 'breast_right'
        const { data, error } = await supabase.from('feeding_logs').insert({ baby_id: babyId, logged_by: user.id, type: feedType, amount_ml: (!isBreast && amount) ? parseFloat(amount) : null, duration_min: null, started_at: now, notes: null, source: 'manual' as const }).select().single()
        if (error) throw error
        addFeedingLog(data)
      }
      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!type) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{titles[type]}</Text>
            <Pressable onPress={onDismiss}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </Pressable>
          </View>

          {type === 'diaper' && (
            <View style={s.section}>
              <View style={s.chipRow}>
                {DIAPER_TYPES.map((t) => (
                  <Pressable key={t.value} style={[s.chip, diaperType === t.value && s.chipActive]} onPress={() => setDiaperType(t.value)}>
                    <Text style={s.chipEmoji}>{t.emoji}</Text>
                    <Text style={[s.chipLabel, diaperType === t.value && s.chipLabelActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {type === 'feeding' && (
            <View style={s.section}>
              <View style={s.chipRow}>
                {FEED_TYPES.map((t) => (
                  <Pressable key={t.value} style={[s.chip, feedType === t.value && s.chipActive]} onPress={() => setFeedType(t.value)}>
                    <Text style={s.chipEmoji}>{t.emoji}</Text>
                    <Text style={[s.chipLabel, feedType === t.value && s.chipLabelActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              {(feedType === 'bottle' || feedType === 'solid') && (
                <TextInput
                  style={s.amountInput}
                  placeholder="Amount (ml)"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>
          )}

          {type === 'sleep' && (
            <View style={s.section}>
              <View style={s.chipRow}>
                {(['nap', 'night'] as SleepType[]).map((t) => (
                  <Pressable key={t} style={[s.chip, s.chipWide, sleepType === t && s.chipActive]} onPress={() => setSleepType(t)}>
                    <Text style={s.chipEmoji}>{t === 'nap' ? '☀️' : '🌙'}</Text>
                    <Text style={[s.chipLabel, sleepType === t && s.chipLabelActive]}>{t === 'nap' ? 'Nap' : 'Night'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.sleepHint}>Starts now — you can log end time later.</Text>
            </View>
          )}

          <View style={s.actions}>
            <Pressable style={s.moreBtn} onPress={() => { onDismiss(); router.push(fullFormPath() as any) }}>
              <Text style={s.moreBtnText}>More options</Text>
            </Pressable>
            <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  section: { padding: 20, paddingBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 64 },
  chipWide: { flex: 1 },
  chipActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  chipEmoji: { fontSize: 20, marginBottom: 2 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipLabelActive: { color: '#00796B' },
  amountInput: { marginTop: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  sleepHint: { fontSize: 13, color: '#9CA3AF', marginTop: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  moreBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  moreBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 2, backgroundColor: '#4DB6AC', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
