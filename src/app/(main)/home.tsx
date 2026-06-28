import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { parseISO, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, formatDistanceToNow, format } from 'date-fns'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import { useAuthStore } from '@/stores/authStore'
import QuickLogSheet from '@/components/logs/QuickLogSheet'
import type { FeedingLog, SleepLog, DiaperLog } from '@/types'

type LogKind = 'feeding' | 'sleep' | 'diaper'

type UnifiedEntry =
  | (FeedingLog & { _kind: 'feeding'; _time: string })
  | (SleepLog & { _kind: 'sleep'; _time: string })
  | (DiaperLog & { _kind: 'diaper'; _time: string })

function calcAge(birthdate: string): string {
  const birth = parseISO(birthdate)
  const now = new Date()
  const days = differenceInDays(now, birth)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} old`
  const weeks = differenceInWeeks(now, birth)
  if (weeks < 8) return `${weeks} week${weeks !== 1 ? 's' : ''} old`
  const months = differenceInMonths(now, birth)
  if (months < 24) return `${months} month${months !== 1 ? 's' : ''} old`
  const years = differenceInYears(now, birth)
  return `${years} year${years !== 1 ? 's' : ''} old`
}

function calcCorrectedAge(birthdate: string, gestationalWeeks: number): string {
  const prematureWeeks = 40 - gestationalWeeks
  const adjustedBirth = new Date(parseISO(birthdate))
  adjustedBirth.setDate(adjustedBirth.getDate() + prematureWeeks * 7)
  const now = new Date()
  const weeks = differenceInWeeks(now, adjustedBirth)
  if (weeks < 8) return `${weeks}w corrected`
  const months = differenceInMonths(now, adjustedBirth)
  return `${months}mo corrected`
}

function feedingLabel(log: FeedingLog): string {
  const labels: Record<string, string> = { breast_left: 'Left breast', breast_right: 'Right breast', bottle: 'Bottle', solid: 'Solid food' }
  const label = labels[log.type] ?? log.type
  if (log.amount_ml) return `${label} · ${log.amount_ml}ml`
  if (log.duration_min) return `${label} · ${log.duration_min}min`
  return label
}

function sleepLabel(log: SleepLog): string {
  const base = log.sleep_type === 'nap' ? 'Nap' : 'Night sleep'
  if (log.ended_at) {
    const mins = Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000)
    const h = Math.floor(mins / 60); const m = mins % 60
    return `${base} · ${h > 0 ? `${h}h ` : ''}${m}min`
  }
  return `${base} · started`
}

function diaperLabel(log: DiaperLog): string {
  return log.diaper_type === 'both' ? 'Wet & dirty' : log.diaper_type === 'wet' ? 'Wet diaper' : 'Dirty diaper'
}

const ENTRY_ICONS: Record<LogKind, string> = { feeding: '🍼', sleep: '😴', diaper: '🚼' }

export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { activeBaby } = useBabyStore()
  const { feedingLogs, sleepLogs, diaperLogs } = useLogsStore()
  const [sheetType, setSheetType] = useState<LogKind | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.display_name ?? 'there'

  const recent = useMemo<UnifiedEntry[]>(() => {
    const all: UnifiedEntry[] = [
      ...feedingLogs.map((l) => ({ ...l, _kind: 'feeding' as const, _time: l.started_at })),
      ...sleepLogs.map((l) => ({ ...l, _kind: 'sleep' as const, _time: l.started_at })),
      ...diaperLogs.map((l) => ({ ...l, _kind: 'diaper' as const, _time: l.changed_at })),
    ]
    return all.sort((a, b) => new Date(b._time).getTime() - new Date(a._time).getTime()).slice(0, 5)
  }, [feedingLogs, sleepLogs, diaperLogs])

  const lastFeed = feedingLogs[0]
  const lastSleep = sleepLogs[0]

  function entryDetail(entry: UnifiedEntry): string {
    if (entry._kind === 'feeding') return feedingLabel(entry as FeedingLog)
    if (entry._kind === 'sleep') return sleepLabel(entry as SleepLog)
    return diaperLabel(entry as DiaperLog)
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.greeting}>{greeting}, {name} 👋</Text>
            {activeBaby ? (
              <View style={s.babyRow}>
                <Text style={s.babyName}>{activeBaby.name}</Text>
                <View style={s.ageBadge}>
                  <Text style={s.ageText}>{calcAge(activeBaby.birthdate)}</Text>
                </View>
                {activeBaby.is_premature && activeBaby.gestational_weeks && (
                  <View style={[s.ageBadge, s.correctedBadge]}>
                    <Text style={[s.ageText, s.correctedText]}>
                      {calcCorrectedAge(activeBaby.birthdate, activeBaby.gestational_weeks)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={s.babyName}>Your baby</Text>
            )}
          </View>
          <Pressable onPress={() => router.push('/(main)/settings')} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color="#6B7280" />
          </Pressable>
        </View>

        {/* Today summary */}
        <Text style={s.section}>Today</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryEmoji}>🍼</Text>
            <Text style={s.summaryLabel}>Last feed</Text>
            <Text style={s.summaryValue}>
              {lastFeed ? formatDistanceToNow(new Date(lastFeed.started_at), { addSuffix: true }) : '—'}
            </Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryEmoji}>😴</Text>
            <Text style={s.summaryLabel}>Last sleep</Text>
            <Text style={s.summaryValue}>
              {lastSleep ? formatDistanceToNow(new Date(lastSleep.started_at), { addSuffix: true }) : '—'}
            </Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryEmoji}>🚼</Text>
            <Text style={s.summaryLabel}>Diapers</Text>
            <Text style={s.summaryValue}>{diaperLogs.length} today</Text>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={s.section}>Quick log</Text>
        <View style={s.actionsRow}>
          {(['feeding', 'sleep', 'diaper'] as LogKind[]).map((kind) => (
            <Pressable key={kind} style={s.actionCard} onPress={() => setSheetType(kind)}>
              <Text style={s.actionEmoji}>{ENTRY_ICONS[kind]}</Text>
              <Text style={s.actionLabel}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</Text>
              <View style={s.actionPlus}>
                <Ionicons name="add" size={14} color="#4DB6AC" />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Recent activity */}
        <View style={s.recentHeader}>
          <Text style={s.section}>Recent activity</Text>
          <Pressable onPress={() => router.push('/(main)/activity')}>
            <Text style={s.seeAll}>See all</Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No logs yet today — tap a quick action above to get started.</Text>
          </View>
        ) : (
          <View style={s.activityList}>
            {recent.map((entry) => (
              <View key={entry.id} style={s.activityRow}>
                <Text style={s.activityIcon}>{ENTRY_ICONS[entry._kind]}</Text>
                <View style={s.activityBody}>
                  <Text style={s.activityDetail}>{entryDetail(entry)}</Text>
                  <Text style={s.activityTime}>{format(new Date(entry._time), 'h:mm a')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Growth shortcut */}
        <Pressable style={s.growthCard} onPress={() => router.push('/(main)/growth')}>
          <Ionicons name="bar-chart-outline" size={20} color="#4DB6AC" />
          <Text style={s.growthLabel}>Growth tracker</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>
      </ScrollView>

      {/* Voice FAB */}
      <Pressable style={s.fab} onPress={() => router.push('/(main)/voice')}>
        <Ionicons name="mic" size={26} color="#ffffff" />
      </Pressable>

      <QuickLogSheet
        visible={sheetType !== null}
        type={sheetType}
        babyId={activeBaby?.id ?? ''}
        onDismiss={() => setSheetType(null)}
        onSaved={() => setSheetType(null)}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  babyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  babyName: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  ageBadge: { backgroundColor: '#E0F2F1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  correctedBadge: { backgroundColor: '#FEF3C7' },
  ageText: { fontSize: 12, color: '#00796B', fontWeight: '600' },
  correctedText: { color: '#92400E' },
  settingsBtn: { padding: 8, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryEmoji: { fontSize: 22, marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  actionCard: { flex: 1, borderWidth: 2, borderColor: '#E0F2F1', borderRadius: 16, padding: 16, alignItems: 'center', backgroundColor: '#F9FEFE', position: 'relative' },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  actionPlus: { position: 'absolute', top: 8, right: 8, backgroundColor: '#E0F2F1', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 },
  seeAll: { fontSize: 13, color: '#4DB6AC', fontWeight: '600' },
  emptyBox: { marginHorizontal: 20, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  activityList: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#ffffff' },
  activityIcon: { fontSize: 22, marginRight: 14 },
  activityBody: { flex: 1 },
  activityDetail: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  activityTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  growthCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, backgroundColor: '#F0FAFA', borderRadius: 14, padding: 16, gap: 10 },
  growthLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#00796B' },
  fab: { position: 'absolute', bottom: 90, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4DB6AC', alignItems: 'center', justifyContent: 'center', shadowColor: '#4DB6AC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
})
