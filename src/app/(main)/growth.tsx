import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, parseISO } from 'date-fns'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useBabyStore } from '@/stores/babyStore'
import { useAuthStore } from '@/stores/authStore'
import { useLogsStore } from '@/stores/logsStore'
import type { GrowthRecord } from '@/types'

function gramsToDisplay(g: number, imperial: boolean): string {
  if (!imperial) return `${(g / 1000).toFixed(2)} kg`
  const lbs = Math.floor(g / 453.592)
  const oz = Math.round((g / 453.592 - lbs) * 16)
  return `${lbs} lb ${oz} oz`
}

function cmToDisplay(cm: number, imperial: boolean): string {
  if (!imperial) return `${cm.toFixed(1)} cm`
  return `${(cm / 2.54).toFixed(1)} in`
}

export default function GrowthScreen() {
  const router = useRouter()
  const { activeBaby } = useBabyStore()
  const { user, profile } = useAuthStore()
  const { growthRecords, setGrowthRecords, addGrowthRecord } = useLogsStore()

  const imperial = profile?.units === 'imperial'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [measuredAt, setMeasuredAt] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [weightText, setWeightText] = useState('')
  const [lengthText, setLengthText] = useState('')
  const [headText, setHeadText] = useState('')

  const loadRecords = useCallback(async () => {
    if (!activeBaby?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('growth_records')
      .select('*')
      .eq('baby_id', activeBaby.id)
      .order('measured_at', { ascending: false })
    setGrowthRecords((data as GrowthRecord[]) ?? [])
    setLoading(false)
  }, [activeBaby?.id])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function handleSave() {
    if (!user || !activeBaby) return
    if (!weightText && !lengthText && !headText) {
      Alert.alert('Nothing to save', 'Enter at least one measurement.')
      return
    }
    setSaving(true)
    try {
      const toGrams = (txt: string) => {
        const n = parseFloat(txt)
        if (!n) return null
        return imperial ? Math.round(n * 453.592) : Math.round(n * 1000)
      }
      const toCm = (txt: string) => {
        const n = parseFloat(txt)
        if (!n) return null
        return imperial ? parseFloat((n * 2.54).toFixed(1)) : n
      }
      const payload = {
        baby_id: activeBaby.id,
        logged_by: user.id,
        weight_g: toGrams(weightText),
        length_cm: toCm(lengthText),
        head_cm: headText ? parseFloat(headText) : null,
        measured_at: measuredAt.toISOString(),
        source: 'manual' as const,
      }
      const { data, error } = await supabase.from('growth_records').insert(payload).select().single()
      if (error) throw error
      addGrowthRecord(data as GrowthRecord)
      setWeightText(''); setLengthText(''); setHeadText('')
      setShowForm(false)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const latest = growthRecords[0]

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={s.title}>Growth</Text>
        <Pressable onPress={() => setShowForm(!showForm)} style={s.addBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#4DB6AC" />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Latest snapshot */}
        {latest && (
          <View style={s.latestCard}>
            <Text style={s.latestTitle}>Latest measurements</Text>
            <Text style={s.latestDate}>{format(parseISO(latest.measured_at), 'MMMM d, yyyy')}</Text>
            <View style={s.statRow}>
              {latest.weight_g && (
                <View style={s.stat}>
                  <Text style={s.statValue}>{gramsToDisplay(latest.weight_g, imperial)}</Text>
                  <Text style={s.statLabel}>Weight</Text>
                </View>
              )}
              {latest.length_cm && (
                <View style={s.stat}>
                  <Text style={s.statValue}>{cmToDisplay(latest.length_cm, imperial)}</Text>
                  <Text style={s.statLabel}>Length</Text>
                </View>
              )}
              {latest.head_cm && (
                <View style={s.stat}>
                  <Text style={s.statValue}>{latest.head_cm.toFixed(1)} cm</Text>
                  <Text style={s.statLabel}>Head circ.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Chart placeholder */}
        <View style={s.chartPlaceholder}>
          <Ionicons name="bar-chart-outline" size={32} color="#4DB6AC" />
          <Text style={s.chartTitle}>Growth chart</Text>
          <Text style={s.chartSub}>Interactive WHO percentile chart with Victory Native XL coming soon.</Text>
        </View>

        {/* Add form */}
        {showForm && (
          <View style={s.form}>
            <Text style={s.formTitle}>Add measurement</Text>
            <Text style={s.label}>Weight ({imperial ? 'lbs' : 'kg'})</Text>
            <TextInput style={s.input} placeholder={imperial ? 'e.g. 7.5' : 'e.g. 3.4'} keyboardType="numeric" value={weightText} onChangeText={setWeightText} placeholderTextColor="#9CA3AF" />
            <Text style={s.label}>Length ({imperial ? 'in' : 'cm'})</Text>
            <TextInput style={s.input} placeholder={imperial ? 'e.g. 20.5' : 'e.g. 52.0'} keyboardType="numeric" value={lengthText} onChangeText={setLengthText} placeholderTextColor="#9CA3AF" />
            <Text style={s.label}>Head circumference (cm)</Text>
            <TextInput style={s.input} placeholder="e.g. 34.5" keyboardType="numeric" value={headText} onChangeText={setHeadText} placeholderTextColor="#9CA3AF" />
            <Text style={s.label}>Date</Text>
            <Pressable style={s.dateRow} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#4DB6AC" />
              <Text style={s.dateText}>{format(measuredAt, 'MMMM d, yyyy')}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={measuredAt}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setMeasuredAt(date) }}
              />
            )}
            <Pressable style={[s.saveBtn, saving && s.saveBtnOff]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save measurement'}</Text>
            </Pressable>
          </View>
        )}

        {/* History list */}
        <Text style={s.historyTitle}>History</Text>
        {loading ? (
          <ActivityIndicator color="#4DB6AC" style={{ marginTop: 20 }} />
        ) : growthRecords.length === 0 ? (
          <Text style={s.empty}>No measurements yet. Tap + to add your first.</Text>
        ) : (
          growthRecords.map((r) => (
            <View key={r.id} style={s.historyRow}>
              <Text style={s.historyDate}>{format(parseISO(r.measured_at), 'MMM d, yyyy')}</Text>
              <View style={s.historyStats}>
                {r.weight_g ? <Text style={s.historyStat}>{gramsToDisplay(r.weight_g, imperial)}</Text> : null}
                {r.length_cm ? <Text style={s.historyStat}>{cmToDisplay(r.length_cm, imperial)}</Text> : null}
                {r.head_cm ? <Text style={s.historyStat}>{r.head_cm.toFixed(1)} cm head</Text> : null}
              </View>
            </View>
          ))
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  latestCard: { backgroundColor: '#F0FAFA', borderRadius: 16, padding: 18, marginBottom: 16 },
  latestTitle: { fontSize: 13, fontWeight: '700', color: '#00796B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  latestDate: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  statRow: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chartPlaceholder: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 },
  chartSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  form: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 18, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#ffffff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#ffffff' },
  dateText: { fontSize: 15, color: '#1A1A1A' },
  saveBtn: { backgroundColor: '#4DB6AC', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  historyRow: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 14 },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  historyStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyStat: { fontSize: 13, color: '#6B7280', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
})
