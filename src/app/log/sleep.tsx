import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { differenceInMinutes } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import type { SleepType } from '@/types'

export default function SleepLogScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { activeBaby } = useBabyStore()
  const { addSleepLog } = useLogsStore()

  const [sleepType, setSleepType] = useState<SleepType>('nap')
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const duration = endTime ? differenceInMinutes(endTime, startTime) : null
  const durationDisplay = duration !== null
    ? `${Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)}h ` : ''}${duration % 60}min`
    : null

  async function handleSave() {
    if (!user || !activeBaby) return
    setSaving(true)
    try {
      const payload = {
        baby_id: activeBaby.id,
        logged_by: user.id,
        sleep_type: sleepType,
        started_at: startTime.toISOString(),
        ended_at: endTime?.toISOString() ?? null,
        notes: notes.trim() || null,
        source: 'manual' as const,
      }
      const { data, error } = await supabase.from('sleep_logs').insert(payload).select().single()
      if (error) throw error
      addSleepLog(data)
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
        <Text style={s.title}>Log Sleep</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.secLabel}>Type</Text>
        <View style={s.typeRow}>
          {(['nap', 'night'] as SleepType[]).map((t) => (
            <Pressable key={t} style={[s.typeBtn, sleepType === t && s.typeBtnActive]} onPress={() => setSleepType(t)}>
              <Text style={s.typeEmoji}>{t === 'nap' ? '☀️' : '🌙'}</Text>
              <Text style={[s.typeBtnText, sleepType === t && s.typeBtnTextActive]}>
                {t === 'nap' ? 'Nap' : 'Night sleep'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.secLabel}>Started</Text>
        <Pressable style={s.timeRow} onPress={() => setShowStartPicker(true)}>
          <Ionicons name="time-outline" size={18} color="#4DB6AC" />
          <Text style={s.timeText}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
        {showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartTime(d) }}
          />
        )}

        <Text style={s.secLabel}>Ended</Text>
        {endTime ? (
          <View style={s.endRow}>
            <Pressable style={[s.timeRow, { flex: 1 }]} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={18} color="#4DB6AC" />
              <Text style={s.timeText}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </Pressable>
            <Pressable style={s.clearBtn} onPress={() => setEndTime(null)}>
              <Ionicons name="close-circle" size={22} color="#9CA3AF" />
            </Pressable>
          </View>
        ) : (
          <View style={s.endOptions}>
            <Pressable style={s.endOptBtn} onPress={() => setEndTime(new Date())}>
              <Text style={s.endOptText}>Just woke up</Text>
            </Pressable>
            <Pressable style={s.endOptBtn} onPress={() => { setEndTime(new Date()); setShowEndPicker(true) }}>
              <Text style={s.endOptText}>Set end time</Text>
            </Pressable>
            <Pressable style={[s.endOptBtn, s.endOptSkip]} onPress={() => {}}>
              <Text style={[s.endOptText, s.endOptSkipText]}>Still sleeping</Text>
            </Pressable>
          </View>
        )}
        {showEndPicker && endTime && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndTime(d) }}
          />
        )}

        {durationDisplay && (
          <View style={s.durationBadge}>
            <Ionicons name="timer-outline" size={16} color="#00796B" />
            <Text style={s.durationText}>Duration: {durationDisplay}</Text>
          </View>
        )}

        <Text style={s.secLabel}>Notes (optional)</Text>
        <TextInput style={[s.input, s.notesInput]} placeholder="Any notes…" multiline value={notes} onChangeText={setNotes} placeholderTextColor="#9CA3AF" />
      </ScrollView>

      <View style={s.footer}>
        <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save sleep log'}</Text>
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
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 },
  typeBtnActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  typeEmoji: { fontSize: 22 },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  typeBtnTextActive: { color: '#00796B' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  timeText: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  endRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { padding: 8 },
  endOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  endOptBtn: { borderWidth: 1, borderColor: '#4DB6AC', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  endOptSkip: { borderColor: '#E5E7EB' },
  endOptText: { fontSize: 14, fontWeight: '500', color: '#4DB6AC' },
  endOptSkipText: { color: '#9CA3AF' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FAFA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  durationText: { fontSize: 14, fontWeight: '600', color: '#00796B' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#4DB6AC', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
