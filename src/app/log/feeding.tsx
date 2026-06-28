import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import type { FeedingType } from '@/types'

const TYPES: { value: FeedingType; emoji: string; label: string; sub: string }[] = [
  { value: 'breast_left', emoji: '🤱', label: 'Left', sub: 'Breast' },
  { value: 'breast_right', emoji: '🤱', label: 'Right', sub: 'Breast' },
  { value: 'bottle', emoji: '🍼', label: 'Bottle', sub: 'Formula / pumped' },
  { value: 'solid', emoji: '🥣', label: 'Solid', sub: 'Food' },
]

export default function FeedingLogScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { activeBaby } = useBabyStore()
  const { addFeedingLog } = useLogsStore()

  const [feedType, setFeedType] = useState<FeedingType>('bottle')
  const [amountText, setAmountText] = useState('')
  const [timerActive, setTimerActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [durationText, setDurationText] = useState('')
  const [logTime, setLogTime] = useState(new Date())
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isBreast = feedType === 'breast_left' || feedType === 'breast_right'

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function toggleTimer() {
    if (timerActive) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerActive(false)
      setDurationText(String(Math.ceil(elapsed / 60)))
    } else {
      setTimerActive(true)
      timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000)
    }
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false); setElapsed(0); setDurationText('')
  }

  const timerDisplay = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  async function handleSave() {
    if (!user || !activeBaby) return
    setSaving(true)
    try {
      const payload = {
        baby_id: activeBaby.id,
        logged_by: user.id,
        type: feedType,
        amount_ml: (!isBreast && amountText) ? parseFloat(amountText) : null,
        duration_min: isBreast
          ? (durationText ? parseInt(durationText, 10) : (elapsed > 0 ? Math.ceil(elapsed / 60) : null))
          : null,
        started_at: logTime.toISOString(),
        notes: notes.trim() || null,
        source: 'manual' as const,
      }
      const { data, error } = await supabase.from('feeding_logs').insert(payload).select().single()
      if (error) throw error
      addFeedingLog(data)
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
        <Text style={s.title}>Log Feeding</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.secLabel}>Type</Text>
        <View style={s.typeGrid}>
          {TYPES.map((t) => (
            <Pressable key={t.value} style={[s.typeCard, feedType === t.value && s.typeCardActive]} onPress={() => setFeedType(t.value)}>
              <Text style={s.typeEmoji}>{t.emoji}</Text>
              <Text style={[s.typeLabel, feedType === t.value && s.typeLabelActive]}>{t.label}</Text>
              <Text style={s.typeSub}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>

        {isBreast ? (
          <>
            <Text style={s.secLabel}>Duration</Text>
            <View style={s.timerRow}>
              <View style={s.timerBox}>
                <Text style={s.timerText}>{timerDisplay}</Text>
              </View>
              <Pressable style={[s.timerBtn, timerActive && s.timerBtnStop]} onPress={toggleTimer}>
                <Ionicons name={timerActive ? 'stop' : 'play'} size={20} color="#fff" />
                <Text style={s.timerBtnText}>{timerActive ? 'Stop' : 'Start'}</Text>
              </Pressable>
              <Pressable onPress={resetTimer} style={s.resetBtn}>
                <Ionicons name="refresh" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            <Text style={s.orHint}>or enter minutes manually</Text>
            <TextInput style={s.input} placeholder="e.g. 15" keyboardType="numeric" value={durationText} onChangeText={setDurationText} placeholderTextColor="#9CA3AF" />
          </>
        ) : (
          <>
            <Text style={s.secLabel}>Amount (ml)</Text>
            <TextInput style={s.input} placeholder="e.g. 120" keyboardType="numeric" value={amountText} onChangeText={setAmountText} placeholderTextColor="#9CA3AF" />
          </>
        )}

        <Text style={s.secLabel}>Time</Text>
        <Pressable style={s.timeRow} onPress={() => setShowTimePicker(true)}>
          <Ionicons name="time-outline" size={18} color="#4DB6AC" />
          <Text style={s.timeText}>{logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            value={logTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setLogTime(d) }}
          />
        )}

        <Text style={s.secLabel}>Notes (optional)</Text>
        <TextInput style={[s.input, s.notesInput]} placeholder="Any notes…" multiline value={notes} onChangeText={setNotes} placeholderTextColor="#9CA3AF" />
      </ScrollView>

      <View style={s.footer}>
        <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save feeding log'}</Text>
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '47%', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  typeCardActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  typeEmoji: { fontSize: 26, marginBottom: 4 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  typeLabelActive: { color: '#00796B' },
  typeSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerBox: { flex: 1, backgroundColor: '#F0FAFA', borderRadius: 12, padding: 14, alignItems: 'center' },
  timerText: { fontSize: 30, fontWeight: '700', color: '#4DB6AC' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4DB6AC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  timerBtnStop: { backgroundColor: '#EF4444' },
  timerBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  resetBtn: { padding: 10 },
  orHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  timeText: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#4DB6AC', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
