import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import type { DiaperType } from '@/types'

const TYPES: { value: DiaperType; emoji: string; label: string; desc: string }[] = [
  { value: 'wet', emoji: '💧', label: 'Wet', desc: 'Pee only' },
  { value: 'dirty', emoji: '💩', label: 'Dirty', desc: 'Poo only' },
  { value: 'both', emoji: '🔄', label: 'Both', desc: 'Pee & poo' },
]

export default function DiaperLogScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { activeBaby } = useBabyStore()
  const { addDiaperLog } = useLogsStore()

  const [diaperType, setDiaperType] = useState<DiaperType>('wet')
  const [changedAt, setChangedAt] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user || !activeBaby) return
    setSaving(true)
    try {
      const payload = {
        baby_id: activeBaby.id,
        logged_by: user.id,
        diaper_type: diaperType,
        changed_at: changedAt.toISOString(),
        notes: notes.trim() || null,
        source: 'manual' as const,
      }
      const { data, error } = await supabase.from('diaper_logs').insert(payload).select().single()
      if (error) throw error
      addDiaperLog(data)
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
          <Ionicons name="close" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={s.title}>Log Diaper</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.secLabel}>Type</Text>
        <View style={s.typeRow}>
          {TYPES.map((t) => (
            <Pressable key={t.value} style={[s.typeCard, diaperType === t.value && s.typeCardActive]} onPress={() => setDiaperType(t.value)}>
              <Text style={s.typeEmoji}>{t.emoji}</Text>
              <Text style={[s.typeLabel, diaperType === t.value && s.typeLabelActive]}>{t.label}</Text>
              <Text style={s.typeDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.secLabel}>Time</Text>
        <Pressable style={s.timeRow} onPress={() => setShowPicker(true)}>
          <Ionicons name="time-outline" size={18} color="#4DB6AC" />
          <Text style={s.timeText}>{changedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={changedAt}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setChangedAt(d) }}
          />
        )}

        <View style={s.nowBtn}>
          <Pressable onPress={() => setChangedAt(new Date())} style={s.nowBtnInner}>
            <Ionicons name="time" size={14} color="#4DB6AC" />
            <Text style={s.nowBtnText}>Reset to now</Text>
          </Pressable>
        </View>

        <Text style={s.secLabel}>Notes (optional)</Text>
        <TextInput style={[s.input, s.notesInput]} placeholder="Any notes…" multiline value={notes} onChangeText={setNotes} placeholderTextColor="#9CA3AF" />
      </ScrollView>

      <View style={s.footer}>
        <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save diaper log'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  secLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, alignItems: 'center' },
  typeCardActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  typeEmoji: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  typeLabelActive: { color: '#00796B' },
  typeDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  timeText: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  nowBtn: { alignItems: 'flex-start', marginTop: 8 },
  nowBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nowBtnText: { fontSize: 13, color: '#4DB6AC', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#4DB6AC', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
