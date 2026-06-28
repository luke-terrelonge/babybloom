import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#4DB6AC" size="large" />
    </View>
  )
}
