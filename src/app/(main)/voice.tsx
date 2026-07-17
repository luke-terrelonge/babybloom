import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, Animated, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { format, differenceInWeeks, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useBabyStore } from '@/stores/babyStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import VoiceConfirmSheet from '@/components/voice/VoiceConfirmSheet'
import type { VoiceLogResult } from '@/types'

type VoiceState = 'idle' | 'recording' | 'stopped' | 'processing' | 'error'

const WAVEFORM_BARS = 32
const MAX_SECONDS = 60
const COUNTDOWN_AT = 50

export default function VoiceScreen() {
  const { user } = useAuthStore()
  const { activeBaby } = useBabyStore()
  const { voiceDailyLimit, plan } = useSubscriptionStore()

  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [waveform, setWaveform] = useState<number[]>(Array(WAVEFORM_BARS).fill(0.05))
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [usageToday, setUsageToday] = useState(0)
  const [parseResult, setParseResult] = useState<VoiceLogResult | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const recordingRef = useRef<Audio.Recording | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

  const isFree = plan === 'free'
  const dailyLimit = voiceDailyLimit()
  const isGated = isFree && usageToday >= dailyLimit

  const loadUsage = useCallback(async () => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase.from('voice_usage').select('count').eq('user_id', user.id).eq('usage_date', today).maybeSingle()
    setUsageToday(data?.count ?? 0)
  }, [user?.id])

  useEffect(() => { loadUsage() }, [loadUsage])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    soundRef.current?.unloadAsync()
  }, [])

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    )
    pulseLoop.current.start()
  }

  function stopPulse() {
    pulseLoop.current?.stop()
    pulseLoop.current = null
    pulseAnim.setValue(1)
  }

  async function startRecording() {
    if (isGated) {
      Alert.alert('Daily limit reached', `Free plan allows ${dailyLimit} voice logs per day. Upgrade to Premium for unlimited voice logging.`)
      return
    }
    const { status } = await Audio.requestPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Microphone access needed', 'Enable microphone access in your device settings to use voice logging.')
      return
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const recording = new Audio.Recording()
    try {
      await recording.prepareToRecordAsync({ ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true })
      await recording.startAsync()
      recordingRef.current = recording
      elapsedRef.current = 0
      setElapsed(0)
      setWaveform(Array(WAVEFORM_BARS).fill(0.05))
      setVoiceState('recording')
      startPulse()

      intervalRef.current = setInterval(async () => {
        elapsedRef.current += 0.2
        const secs = Math.floor(elapsedRef.current)
        setElapsed(secs)

        if (elapsedRef.current >= MAX_SECONDS) {
          await stopRecording()
          return
        }
        try {
          const status = await recordingRef.current?.getStatusAsync()
          const db = status?.metering ?? -160
          const norm = Math.max(0.05, Math.min(1, (db + 160) / 160))
          setWaveform((prev) => [...prev.slice(1), norm])
        } catch {}
      }, 200)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Could not start recording')
      setVoiceState('error')
    }
  }

  async function stopRecording() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    stopPulse()
    const rec = recordingRef.current
    recordingRef.current = null
    if (!rec) return
    try {
      await rec.stopAndUnloadAsync()
      const uri = rec.getURI()
      if (uri) { setAudioUri(uri); setVoiceState('stopped') }
      else { setErrorMsg('No audio captured — try again.'); setVoiceState('error') }
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Could not stop recording')
      setVoiceState('error')
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  }

  async function togglePlayback() {
    if (!audioUri) return
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri })
      sound.setOnPlaybackStatusUpdate((st) => { if (st.isLoaded && st.didJustFinish) setIsPlaying(false) })
      soundRef.current = sound
    }
    if (isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false) }
    else { await soundRef.current.playAsync(); setIsPlaying(true) }
  }

  function resetToIdle() {
    soundRef.current?.unloadAsync()
    soundRef.current = null
    setAudioUri(null)
    setElapsed(0)
    setIsPlaying(false)
    setWaveform(Array(WAVEFORM_BARS).fill(0.05))
    setVoiceState('idle')
    setErrorMsg('')
  }

  async function processAudio() {
    if (!audioUri || !user || !activeBaby) return
    setVoiceState('processing')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const ext = audioUri.split('.').pop() ?? 'm4a'
      const filePath = `${user.id}/${Date.now()}.${ext}`
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
      const uploadUrl = `${supabaseUrl}/storage/v1/object/voice-logs/${filePath}`

      const formData = new FormData()
      formData.append('', { uri: audioUri, name: `recording.${ext}`, type: `audio/mp4` } as any)
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}` },
        body: formData,
      })
      if (!uploadRes.ok) {
        const body = await uploadRes.text()
        throw new Error(`Upload failed (${uploadRes.status}): ${body}`)
      }

      const { data: signedData, error: signErr } = await supabase.storage.from('voice-logs').createSignedUrl(filePath, 300)
      if (signErr || !signedData?.signedUrl) throw new Error('Could not get audio URL')

      const babyAgeWeeks = differenceInWeeks(new Date(), parseISO(activeBaby.birthdate))
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('parse-voice-log', {
        body: {
          audioUrl: signedData.signedUrl,
          babyId: activeBaby.id,
          babyName: activeBaby.name,
          babyAgeWeeks,
          feedingPreference: activeBaby.feeding_preference,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (fnData?.error) throw new Error(fnData.error)

      setParseResult(fnData as VoiceLogResult)
      setVoiceState('stopped')
      setShowConfirm(true)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Could not process your recording')
      setVoiceState('error')
    }
  }

  const timerMins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const timerSecs = String(elapsed % 60).padStart(2, '0')
  const showCountdown = elapsed >= COUNTDOWN_AT

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Voice Log</Text>

      {isFree && (
        <View style={s.usageRow}>
          <Ionicons name="mic-outline" size={14} color={isGated ? '#EF4444' : '#9CA3AF'} />
          <Text style={[s.usageText, isGated && s.usageTextGated]}>
            {usageToday} / {dailyLimit} voice logs today
          </Text>
          {isGated && <Text style={s.upgradeLink}>Upgrade for unlimited</Text>}
        </View>
      )}

      {/* Waveform */}
      <View style={s.waveformArea}>
        {(voiceState === 'recording' || voiceState === 'stopped') && (
          <View style={s.waveform}>
            {waveform.map((v, i) => (
              <View
                key={i}
                style={[
                  s.waveBar,
                  { height: Math.max(4, v * 64), opacity: 0.4 + v * 0.6 },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={s.timerArea}>
        {voiceState === 'recording' && (
          <>
            <Text style={s.timer}>{timerMins}:{timerSecs}</Text>
            {showCountdown && (
              <Text style={s.countdown}>Auto-stop in {MAX_SECONDS - elapsed}s</Text>
            )}
          </>
        )}
      </View>

      {/* Main control */}
      <View style={s.controlArea}>
        {voiceState === 'idle' && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              style={[s.micBtn, isGated && s.micBtnDisabled]}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={44} color="#ffffff" />
            </Pressable>
          </Animated.View>
        )}

        {voiceState === 'recording' && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable style={s.stopBtn} onPress={stopRecording}>
              <View style={s.stopSquare} />
            </Pressable>
          </Animated.View>
        )}

        {voiceState === 'stopped' && (
          <View style={s.stoppedControls}>
            <Pressable style={s.reRecordBtn} onPress={resetToIdle}>
              <Ionicons name="refresh" size={22} color="#6B7280" />
              <Text style={s.reRecordText}>Re-record</Text>
            </Pressable>
            <Pressable style={s.playBtn} onPress={togglePlayback}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#4DB6AC" />
            </Pressable>
            <Pressable style={s.processBtn} onPress={processAudio}>
              <Ionicons name="arrow-up-circle" size={20} color="#ffffff" />
              <Text style={s.processBtnText}>Understand</Text>
            </Pressable>
          </View>
        )}

        {voiceState === 'processing' && (
          <View style={s.processingBlock}>
            <ActivityIndicator size="large" color="#4DB6AC" />
            <Text style={s.processingText}>Listening…</Text>
          </View>
        )}

        {voiceState === 'error' && (
          <View style={s.errorBlock}>
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
            <Text style={s.errorText}>{errorMsg || 'Something went wrong'}</Text>
            <Pressable style={s.retryBtn} onPress={resetToIdle}>
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Hint text */}
      <Text style={s.hint}>
        {voiceState === 'idle' && !isGated && 'Tap the mic and speak naturally'}
        {voiceState === 'idle' && isGated && 'Daily free limit reached'}
        {voiceState === 'recording' && 'Speak clearly, then tap stop'}
        {voiceState === 'stopped' && 'Review your recording, then tap Understand'}
        {voiceState === 'processing' && ' '}
        {voiceState === 'error' && ' '}
      </Text>

      <View style={s.examples}>
        <Text style={s.examplesTitle}>Try saying:</Text>
        {[
          '"Fed 120ml bottle just now"',
          '"She fell asleep for a nap"',
          '"Just changed a wet nappy"',
          '"Weighed her — 4.2 kilos"',
        ].map((ex) => (
          <Text key={ex} style={s.exampleItem}>{ex}</Text>
        ))}
      </View>

      {parseResult && (
        <VoiceConfirmSheet
          visible={showConfirm}
          result={parseResult}
          babyId={activeBaby?.id ?? ''}
          onDismiss={() => { setShowConfirm(false); setParseResult(null); resetToIdle() }}
          onSaved={() => { setShowConfirm(false); setParseResult(null); resetToIdle(); loadUsage() }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, marginBottom: 8 },
  usageText: { fontSize: 13, color: '#9CA3AF' },
  usageTextGated: { color: '#EF4444' },
  upgradeLink: { fontSize: 13, color: '#4DB6AC', fontWeight: '600' },
  waveformArea: { height: 80, justifyContent: 'center', paddingHorizontal: 20 },
  waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 80 },
  waveBar: { width: 4, backgroundColor: '#4DB6AC', borderRadius: 2 },
  timerArea: { height: 44, alignItems: 'center', justifyContent: 'center' },
  timer: { fontSize: 30, fontWeight: '700', color: '#1A1A1A', fontVariant: ['tabular-nums'] },
  countdown: { fontSize: 13, color: '#EF4444', fontWeight: '600', marginTop: 2 },
  controlArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#4DB6AC', alignItems: 'center', justifyContent: 'center', shadowColor: '#4DB6AC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  micBtnDisabled: { backgroundColor: '#D1D5DB' },
  stopBtn: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  stopSquare: { width: 30, height: 30, backgroundColor: '#ffffff', borderRadius: 6 },
  stoppedControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reRecordBtn: { alignItems: 'center', gap: 4 },
  reRecordText: { fontSize: 11, color: '#6B7280' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FAFA', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4DB6AC' },
  processBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#4DB6AC', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14 },
  processBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  processingBlock: { alignItems: 'center', gap: 12 },
  processingText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  errorBlock: { alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  hint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginBottom: 20 },
  examples: { marginHorizontal: 24, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 32 },
  examplesTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  exampleItem: { fontSize: 14, color: '#6B7280', marginBottom: 6, fontStyle: 'italic' },
})
