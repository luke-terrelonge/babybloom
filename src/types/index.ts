export type MemberRole = 'parent' | 'caregiver'
export type Gender = 'male' | 'female' | 'other'
export type FeedingType = 'breast_left' | 'breast_right' | 'bottle' | 'solid'
export type SleepType = 'nap' | 'night'
export type DiaperType = 'wet' | 'dirty' | 'both'
export type FeedingPreference = 'breast' | 'formula' | 'mixed'
export type LogSource = 'manual' | 'voice'
export type SubscriptionPlan = 'free' | 'premium' | 'family'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial'
export type VoiceLogType = 'feeding' | 'sleep' | 'diaper' | 'growth' | 'unknown'
export type SuggestionCategory = 'sleep' | 'feeding' | 'growth' | 'milestone'
export type SuggestionSeverity = 'info' | 'attention' | 'consult'
export type Units = 'metric' | 'imperial'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  units: Units
  onboarding_complete: boolean
  created_at: string
}

export interface Baby {
  id: string
  name: string
  birthdate: string
  gender: Gender
  birth_weight_g: number | null
  birth_length_cm: number | null
  feeding_preference: FeedingPreference
  is_premature: boolean
  gestational_weeks: number | null
  photo_url: string | null
  created_at: string
}

export interface BabyMember {
  id: string
  baby_id: string
  user_id: string
  role: MemberRole
  invited_by: string | null
  joined_at: string
  profile?: Profile
}

export interface BabyInvite {
  id: string
  baby_id: string
  created_by: string
  code: string
  role: MemberRole
  expires_at: string
  used_by: string | null
  used_at: string | null
}

export interface FeedingLog {
  id: string
  baby_id: string
  logged_by: string
  type: FeedingType
  amount_ml: number | null
  duration_min: number | null
  started_at: string
  notes: string | null
  source: LogSource
}

export interface SleepLog {
  id: string
  baby_id: string
  logged_by: string
  sleep_type: SleepType
  started_at: string
  ended_at: string | null
  notes: string | null
  source: LogSource
}

export interface DiaperLog {
  id: string
  baby_id: string
  logged_by: string
  diaper_type: DiaperType
  changed_at: string
  notes: string | null
  source: LogSource
}

export interface GrowthRecord {
  id: string
  baby_id: string
  logged_by: string
  weight_g: number | null
  length_cm: number | null
  head_cm: number | null
  measured_at: string
  source: LogSource
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trial_ends_at: string | null
  renews_at: string | null
  revenuecat_customer_id: string | null
  updated_at: string
}

export interface VoiceLogResult {
  transcript: string
  logType: VoiceLogType
  confidence: number
  fields: Partial<{
    feedingType: FeedingType
    amount_ml: number
    duration_min: number
    started_at: string
    sleepType: SleepType
    ended_at: string
    diaperType: DiaperType
    changed_at: string
    weight_g: number
    length_cm: number
  }>
}

export interface Suggestion {
  id: string
  category: SuggestionCategory
  title: string
  body: string
  severity: SuggestionSeverity
  source: string
  learnMoreUrl?: string
}

export type AnyLog = FeedingLog | SleepLog | DiaperLog | GrowthRecord

export interface TodaySummary {
  lastFeedAt: string | null
  lastSleepAt: string | null
  diaperCount: number
  totalSleepMinutes: number
  feedCount: number
}
