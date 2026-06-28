import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useLogsStore } from '@/stores/logsStore'
import type { FeedingLog, SleepLog, DiaperLog } from '@/types'

export default function MainLayout() {
  const { user } = useAuthStore()
  const { activeBaby, setActiveBaby, setBabies, setMembers } = useBabyStore()
  const { setFeedingLogs, setSleepLogs, setDiaperLogs, addFeedingLog, addSleepLog, addDiaperLog } = useLogsStore()

  useEffect(() => {
    if (!user || activeBaby) return
    ;(async () => {
      const { data } = await supabase
        .from('baby_members')
        .select('id, role, joined_at, babies(*)')
        .eq('user_id', user.id)
      if (!data?.length) return
      const babies = (data as any[]).map((m) => m.babies).filter(Boolean)
      const members = (data as any[]).map((m) => ({
        id: m.id, baby_id: m.babies?.id ?? '', user_id: user.id,
        role: m.role, invited_by: null, joined_at: m.joined_at,
      }))
      setBabies(babies)
      if (babies[0]) setActiveBaby(babies[0])
      setMembers(members)
    })()
  }, [user?.id])

  useEffect(() => {
    if (!activeBaby?.id) return
    const babyId = activeBaby.id
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const iso = today.toISOString()

    ;(async () => {
      const [{ data: f }, { data: s }, { data: d }] = await Promise.all([
        supabase.from('feeding_logs').select('*').eq('baby_id', babyId).gte('started_at', iso).order('started_at', { ascending: false }),
        supabase.from('sleep_logs').select('*').eq('baby_id', babyId).gte('started_at', iso).order('started_at', { ascending: false }),
        supabase.from('diaper_logs').select('*').eq('baby_id', babyId).gte('changed_at', iso).order('changed_at', { ascending: false }),
      ])
      setFeedingLogs((f as FeedingLog[]) ?? [])
      setSleepLogs((s as SleepLog[]) ?? [])
      setDiaperLogs((d as DiaperLog[]) ?? [])
    })()

    const channel = supabase
      .channel(`baby-${babyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feeding_logs', filter: `baby_id=eq.${babyId}` }, (p) => addFeedingLog(p.new as FeedingLog))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sleep_logs', filter: `baby_id=eq.${babyId}` }, (p) => addSleepLog(p.new as SleepLog))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'diaper_logs', filter: `baby_id=eq.${babyId}` }, (p) => addDiaperLog(p.new as DiaperLog))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeBaby?.id])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4DB6AC',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: '#E5E7EB', backgroundColor: '#ffffff' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="suggestions"
        options={{
          title: 'Tips',
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="growth" options={{ href: null }} />
      <Tabs.Screen name="baby-profile" options={{ href: null }} />
    </Tabs>
  )
}
