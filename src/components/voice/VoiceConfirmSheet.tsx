import { useState } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useLogsStore } from '@/stores/logsStore'
import type { VoiceLogResult, FeedingType, SleepType, DiaperType, VoiceLogType } from '@/types'

interface Props {
  visible: boolean
  result: VoiceLogResult
  babyId: string
  onDismiss: () => void
  onSaved: () => void
}

const FEED_OPTS: { value: FeedingType; emoji: string; label: string }[] = [
  { value: 'breast_left', emoji: '🤱', label: 'Left' },
  { value: 'breast_right', emoji: '🤱', label: 'Right' },
  { value: 'bottle', emoji: '🍼', label: 'Bottle' },
  { value: 'solid', emoji: '🥣', label: 'Solid' },
]
const DIAPER_OPTS: { value: DiaperType; emoji: string; label: string }[] = [
  { value: 'wet', emoji: '💧', label: 'Wet' },
  { value: 'dirty', emoji: '💩', label: 'Dirty' },
  { value: 'both', emoji: '🔄', label: 'Both' },
]
const LOG_TYPE_OPTS: { value: VoiceLogType; emoji: string; label: string }[] = [
  { value: 'feeding', emoji: '🍼', label: 'Feeding' },
  { value: 'sleep', emoji: '😴', label: 'Sleep' },
  { value: 'diaper', emoji: '🚼', label: 'Diaper' },
  { value: 'growth', emoji: '📏', label: 'Growth' },
]

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.85 ? '#00796B' : confidence >= 0.6 ? '#D97706' : '#DC2626'
  const bg = confidence >= 0.85 ? '#F0FAFA' : confidence >= 0.6 ? '#FFFBEB' : '#FEF2F2'
  const label = confidence >= 0.85 ? `${pct}% confident` : confidence >= 0.6 ? `${pct}% — check fields` : 'Unsure — please review'
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Ionicons name="sparkles" size={12} color={color} />
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function TypeChip<T extends string>({
  options, value, onSelect,
}: {
  options: { value: T; emoji: string; label: string }[]
  value: T
  onSelect: (v: T) => void
}) {
  return (
    <View style={s.chipRow}>
      {options.map((o) => (
        <Pressable key={o.value} style={[s.chip, value === o.value && s.chipActive]} onPress={() => onSelect(o.value)}>
          <Text style={s.chipEmoji}>{o.emoji}</Text>
          <Text style={[s.chipLabel, value === o.value && s.chipLabelActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export default function VoiceConfirmSheet({ visible, result, babyId, onDismiss, onSaved }: Props) {
  const { user } = useAuthStore()
  const { addFeedingLog, addSleepLog, addDiaperLog } = useLogsStore()

  const [logType, setLogType] = useState<VoiceLogType>(
    result.logType === 'unknown' ? 'feeding' : result.logType
  )
  const [feedType, setFeedType] = useState<FeedingType>(result.fields.feedingType ?? 'bottle')
  const [amountText, setAmountText] = useState(result.fields.amount_ml ? String(result.fields.amount_ml) : '')
  const [durationText, setDurationText] = useState(result.fields.duration_min ? String(result.fields.duration_min) : '')
  const [sleepType, setSleepType] = useState<SleepType>(result.fields.sleepType ?? 'nap')
  const [diaperType, setDiaperType] = useState<DiaperType>(result.fields.diaperType ?? 'wet')
  const [weightText, setWeightText] = useState(result.fields.weight_g ? String(Math.round(result.fields.weight_g / 10) / 100) : '')
  const [lengthText, setLengthText] = useState(result.fields.length_cm ? String(result.fields.length_cm) : '')
  const [saving, setSaving] = useState(false)

  const isBreast = feedType === 'breast_left' || feedType === 'breast_right'

  async function handleSave() {
    if (!user || !babyId) return
    setSaving(true)
    const now = new Date().toISOString()
    let resultingLogId: string | null = null
    let resultingLogTable: string | null = null

    try {
      if (logType === 'feeding') {
        const { data, error } = await supabase.from('feeding_logs').insert({
          baby_id: babyId, logged_by: user.id, type: feedType,
          amount_ml: (!isBreast && amountText) ? parseFloat(amountText) : null,
          duration_min: (isBreast && durationText) ? parseInt(durationText, 10) : null,
          started_at: now, notes: null, source: 'voice' as const,
        }).select().single()
        if (error) throw error
        resultingLogId = data.id; resultingLogTable = 'feeding_logs'
        addFeedingLog(data)
      } else if (logType === 'sleep') {
        const { data, error } = await supabase.from('sleep_logs').insert({
          baby_id: babyId, logged_by: user.id, sleep_type: sleepType,
          started_at: now, ended_at: null, notes: null, source: 'voice' as const,
        }).select().single()
        if (error) throw error
        resultingLogId = data.id; resultingLogTable = 'sleep_logs'
        addSleepLog(data)
      } else if (logType === 'diaper') {
        const { data, error } = await supabase.from('diaper_logs').insert({
          baby_id: babyId, logged_by: user.id, diaper_type: diaperType,
          changed_at: now, notes: null, source: 'voice' as const,
        }).select().single()
        if (error) throw error
        resultingLogId = data.id; resultingLogTable = 'diaper_logs'
        addDiaperLog(data)
      } else if (logType === 'growth') {
        const { data, error } = await supabase.from('growth_records').insert({
          baby_id: babyId, logged_by: user.id,
          weight_g: weightText ? Math.round(parseFloat(weightText) * 1000) : null,
          length_cm: lengthText ? parseFloat(lengthText) : null,
          head_cm: null, measured_at: now, source: 'voice' as const,
        }).select().single()
        if (error) throw error
        resultingLogId = data.id; resultingLogTable = 'growth_records'
      }

      await supabase.from('voice_logs').insert({
        baby_id: babyId, logged_by: user.id,
        raw_transcript: result.transcript,
        parsed_log_type: result.logType,
        confidence: result.confidence,
        resulting_log_id: resultingLogId,
        resulting_log_table: resultingLogTable,
      })

      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: existing } = await supabase.from('voice_usage').select('count').eq('user_id', user.id).eq('usage_date', today).maybeSingle()
      await supabase.from('voice_usage').upsert(
        { user_id: user.id, usage_date: today, count: (existing?.count ?? 0) + 1 },
        { onConflict: 'user_id,usage_date' }
      )

      onSaved()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.headerTitle}>Confirm voice log</Text>
            <Pressable onPress={onDismiss}><Ionicons name="close" size={22} color="#9CA3AF" /></Pressable>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {/* Transcript */}
            <View style={s.transcriptBox}>
              <Ionicons name="mic" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
              <Text style={s.transcriptText}>"{result.transcript}"</Text>
            </View>

            <ConfidenceBadge confidence={result.confidence} />

            {/* Log type selector (always shown — lets user correct mistakes) */}
            <Text style={s.secLabel}>Log type</Text>
            <TypeChip options={LOG_TYPE_OPTS} value={logType as VoiceLogType} onSelect={(v) => setLogType(v)} />

            {/* Type-specific fields */}
            {logType === 'feeding' && (
              <>
                <Text style={s.secLabel}>Feeding type</Text>
                <TypeChip options={FEED_OPTS} value={feedType} onSelect={setFeedType} />
                {isBreast ? (
                  <>
                    <Text style={s.secLabel}>Duration (min)</Text>
                    <TextInput style={s.input} placeholder="e.g. 15" keyboardType="numeric" value={durationText} onChangeText={setDurationText} placeholderTextColor="#9CA3AF" />
                  </>
                ) : (
                  <>
                    <Text style={s.secLabel}>Amount (ml)</Text>
                    <TextInput style={s.input} placeholder="e.g. 120" keyboardType="numeric" value={amountText} onChangeText={setAmountText} placeholderTextColor="#9CA3AF" />
                  </>
                )}
              </>
            )}

            {logType === 'sleep' && (
              <>
                <Text style={s.secLabel}>Sleep type</Text>
                <View style={s.chipRow}>
                  {(['nap', 'night'] as SleepType[]).map((t) => (
                    <Pressable key={t} style={[s.chip, s.chipWide, sleepType === t && s.chipActive]} onPress={() => setSleepType(t)}>
                      <Text style={s.chipEmoji}>{t === 'nap' ? '☀️' : '🌙'}</Text>
                      <Text style={[s.chipLabel, sleepType === t && s.chipLabelActive]}>{t === 'nap' ? 'Nap' : 'Night'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.fieldHint}>Start time will be logged as now. You can end the sleep session later.</Text>
              </>
            )}

            {logType === 'diaper' && (
              <>
                <Text style={s.secLabel}>Diaper type</Text>
                <TypeChip options={DIAPER_OPTS} value={diaperType} onSelect={setDiaperType} />
              </>
            )}

            {logType === 'growth' && (
              <>
                <Text style={s.secLabel}>Weight (kg)</Text>
                <TextInput style={s.input} placeholder="e.g. 4.2" keyboardType="numeric" value={weightText} onChangeText={setWeightText} placeholderTextColor="#9CA3AF" />
                <Text style={s.secLabel}>Length (cm)</Text>
                <TextInput style={s.input} placeholder="e.g. 52.0" keyboardType="numeric" value={lengthText} onChangeText={setLengthText} placeholderTextColor="#9CA3AF" />
              </>
            )}
          </ScrollView>

          <View style={s.actions}>
            <Pressable style={s.dismissBtn} onPress={onDismiss}>
              <Text style={s.dismissBtnText}>Re-record</Text>
            </Pressable>
            <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save log'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 20, paddingBottom: 8 },
  transcriptBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 12 },
  transcriptText: { flex: 1, fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 4 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  secLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  chipWide: { flex: 1 },
  chipActive: { borderColor: '#4DB6AC', backgroundColor: '#F0FAFA' },
  chipEmoji: { fontSize: 18, marginBottom: 2 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipLabelActive: { color: '#00796B' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#F9FAFB' },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, lineHeight: 16 },
  actions: { flexDirection: 'row', padding: 20, paddingBottom: 36, gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dismissBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  dismissBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 2, backgroundColor: '#4DB6AC', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
})
