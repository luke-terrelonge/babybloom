import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function SuggestionsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Ionicons name="bulb-outline" size={48} color="#4DB6AC" />
        <Text style={s.title}>Smart Tips</Text>
        <Text style={s.sub}>Personalised suggestions based on your baby's patterns are coming in Phase 6.</Text>
      </View>
    </SafeAreaView>
  )
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  sub: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
})
