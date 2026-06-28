import { create } from 'zustand'
import type { Subscription, SubscriptionPlan } from '@/types'

const CARER_LIMITS: Record<SubscriptionPlan, number> = {
  free: 1,
  premium: 4,
  family: Infinity,
}

const BABY_LIMITS: Record<SubscriptionPlan, number> = {
  free: 1,
  premium: 1,
  family: Infinity,
}

const VOICE_DAILY_LIMIT: Record<SubscriptionPlan, number> = {
  free: 5,
  premium: Infinity,
  family: Infinity,
}

interface SubscriptionState {
  subscription: Subscription | null
  plan: SubscriptionPlan
  setSubscription: (sub: Subscription | null) => void
  carerLimit: () => number
  babyLimit: () => number
  voiceDailyLimit: () => number
  canAddCarer: (currentCount: number) => boolean
  canAddBaby: (currentCount: number) => boolean
  hasGrowthCharts: () => boolean
  hasPushNotifications: () => boolean
  hasExport: () => boolean
  hasMilestones: () => boolean
  hasRealtimeFeed: () => boolean
  hasMultiBabyFeed: () => boolean
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  plan: 'free',
  setSubscription: (sub) =>
    set({ subscription: sub, plan: sub?.plan ?? 'free' }),
  carerLimit: () => CARER_LIMITS[get().plan],
  babyLimit: () => BABY_LIMITS[get().plan],
  voiceDailyLimit: () => VOICE_DAILY_LIMIT[get().plan],
  canAddCarer: (count) => count < CARER_LIMITS[get().plan],
  canAddBaby: (count) => count < BABY_LIMITS[get().plan],
  hasGrowthCharts: () => get().plan !== 'free',
  hasPushNotifications: () => get().plan !== 'free',
  hasExport: () => get().plan !== 'free',
  hasMilestones: () => get().plan !== 'free',
  hasRealtimeFeed: () => get().plan !== 'free',
  hasMultiBabyFeed: () => get().plan === 'family',
}))
