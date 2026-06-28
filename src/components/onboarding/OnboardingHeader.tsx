import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  step: number
  total?: number
  onBack?: () => void
}

export function OnboardingHeader({ step, total = 7, onBack }: Props) {
  return (
    <View style={styles.root}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.barWrap}>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${(step / total) * 100}%` as any }]} />
        </View>
      </View>
      <Text style={styles.stepLabel}>{step}/{total}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  back: { padding: 4 },
  placeholder: { width: 32 },
  barWrap: { flex: 1 },
  barBg: { height: 4, backgroundColor: '#E0F2F1', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#4DB6AC', borderRadius: 2 },
  stepLabel: { fontSize: 12, color: '#9CA3AF', minWidth: 28, textAlign: 'right' },
})
