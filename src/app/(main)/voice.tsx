import { View, Text, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function VoiceScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <View style={s.micRing}>
          <Ionicons name="mic" size={40} color="#4DB6AC" />
        </View>
        <Text style={s.title}>Voice Logging</Text>
        <Text style={s.sub}>Say things like "fed 120ml bottle" or "nap started" and we'll log it automatically. Coming in Phase 4.</Text>
      </View>
    </SafeAreaView>
  )
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  micRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
})
