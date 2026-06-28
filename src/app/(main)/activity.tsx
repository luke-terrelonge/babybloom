import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, isSameDay, formatDistanceToNow } from 'date-fns'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useBabyStore } from '@/stores/babyStore'
import { useAuthStore } from '@/stores/authStore'
import type { FeedingLog, SleepLog, DiaperLog } from '@/types'

type UnifiedEntry =
  | (FeedingLog & { _kind: 'feeding'; _time: string })
  | (SleepLog & { _kind: 'sleep'; _time: string })
  | (DiaperLog & { _kind: 'diaper'; _time: string })

const KIND_ICONS: Record<string, string> = { feeding: '🍼', sleep: '😴', diaper: '🚼' }

function entryDetail(entry: UnifiedEntry): string {
  if (entry._kind === 'feeding') {
    const e = entry as FeedingLog & { _kind: 'feeding'; _time: string }
    const labels: Record<string, string> = { breast_left: 'Left breast', breast_right: 'Right breast', bottle: 'Bottle', solid: 'Solid food' }
    const base = labels[e.type] ?? e.type
    if (e.amount_ml) return `${base} · ${e.amount_ml}ml`
    if (e.duration_min) return `${base} · ${e.duration_min}min`
    return base
  }
  if (entry._kind === 'sleep') {
    const e = entry as SleepLog & { _kind: 'sleep'; _time: string }
    const base = e.sleep_type === 'nap' ? 'Nap' : 'Night sleep'
    if (e.ended_at) {
      const mins = Math.round((new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 60000)
      const h = Math.floor(mins / 60); const m = mins % 60
      return `${base} · ${h > 0 ? `${h}h ` : ''}${m}min`
    }
    return `${base} · ongoing`
  }
  const e = entry as DiaperLog & { _kind: 'diaper'; _time: string }
  return e.diaper_type === 'both' ? 'Wet & dirty' : e.diaper_type === 'wet' ? 'Wet diaper' : 'Dirty diaper'
}

export default function ActivityScreen() {
  const router = useRouter()
  const { activeBaby, members } = useBabyStore()
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [entries, setEntries] = useState<UnifiedEntry[]>([])
  const [loading, setLoading] = useState(true)

  const isParent = members.find((m) => m.user_id === user?.id)?.role === 'parent'

  const loadLogs = useCallback(async (date: Date) => {
    if (!activeBaby?.id) return
    setLoading(true)
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    const s = start.toISOString(); const e = end.toISOString()

    const [{ data: f }, { data: sl }, { data: d }] = await Promise.all([
      supabase.from('feeding_logs').select('*').eq('baby_id', activeBaby.id).gte('started_at', s).lte('started_at', e),
      supabase.from('sleep_logs').select('*').eq('baby_id', activeBaby.id).gte('started_at', s).lte('started_at', e),
      supabase.from('diaper_logs').select('*').eq('baby_id', activeBaby.id).gte('changed_at', s).lte('changed_at', e),
    ])
    const all: UnifiedEntry[] = [
      ...((f ?? []) as FeedingLog[]).map((l) => ({ ...l, _kind: 'feeding' as const, _time: l.started_at })),
      ...((sl ?? []) as SleepLog[]).map((l) => ({ ...l, _kind: 'sleep' as const, _time: l.started_at })),
      ...((d ?? []) as DiaperLog[]).map((l) => ({ ...l, _kind: 'diaper' as const, _time: l.changed_at })),
    ]
    setEntries(all.sort((a, b) => new Date(b._time).getTime() - new Date(a._time).getTime()))
    setLoading(false)
  }, [activeBaby?.id])

  useEffect(() => { loadLogs(selectedDate) }, [selectedDate, loadLogs])

  async function deleteEntry(entry: UnifiedEntry) {
    const table = entry._kind === 'feeding' ? 'feeding_logs' : entry._kind === 'sleep' ? 'sleep_logs' : 'diaper_logs'
    Alert.alert('Delete log', 'Remove this entry permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from(table).delete().eq('id', entry.id)
          setEntries((prev) => prev.filter((e) => e.id !== entry.id))
        },
      },
    ])
  }

  const isToday = isSameDay(selectedDate, new Date())

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={s.title}>Activity</Text>
        <Pressable onPress={() => setShowPicker(true)} style={s.dateBtn}>
          <Ionicons name="calendar-outline" size={20} color="#4DB6AC" />
          <Text style={s.dateLabel}>{isToday ? 'Today' : format(selectedDate, 'MMM d')}</Text>
        </Pressable>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowPicker(Platform.OS === 'ios')
            if (date) setSelectedDate(date)
          }}
        />
      )}

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#4DB6AC" />
        </View>
      ) : entries.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTitle}>No logs for {isToday ? 'today' : format(selectedDate, 'MMM d')}</Text>
          <Text style={s.emptySub}>Use the quick actions on the home screen to add your first log.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.entryRow}>
              <Text style={s.entryIcon}>{KIND_ICONS[item._kind]}</Text>
              <View style={s.entryBody}>
                <Text style={s.entryDetail}>{entryDetail(item)}</Text>
                <Text style={s.entryTime}>{format(new Date(item._time), 'h:mm a')}</Text>
              </View>
              {isParent && (
                <Pressable style={s.deleteBtn} onPress={() => deleteEntry(item)}>
                  <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FAFA', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  dateLabel: { fontSize: 14, fontWeight: '600', color: '#00796B' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  list: { padding: 16 },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  entryIcon: { fontSize: 24, marginRight: 14 },
  entryBody: { flex: 1 },
  entryDetail: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  entryTime: { fontSize: 13, color: '#9CA3AF', marginTop: 3 },
  deleteBtn: { padding: 8 },
  sep: { height: 8 },
})
