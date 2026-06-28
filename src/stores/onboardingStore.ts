import { create } from 'zustand'
import type { FeedingPreference, Gender } from '@/types'

interface OnboardingData {
  displayName: string
  avatarUri: string | null
  babyName: string
  birthdate: Date
  gender: Gender | null
  birthWeightG: number | null
  birthLengthCm: number | null
  feedingPreference: FeedingPreference | null
  isPremature: boolean
  gestationalWeeks: number
}

interface OnboardingState extends OnboardingData {
  update: (fields: Partial<OnboardingData>) => void
  reset: () => void
}

const DEFAULTS: Omit<OnboardingData, 'birthdate'> & { birthdateOffset: number } = {
  displayName: '',
  avatarUri: null,
  babyName: '',
  birthdateOffset: 30,
  gender: null,
  birthWeightG: null,
  birthLengthCm: null,
  feedingPreference: null,
  isPremature: false,
  gestationalWeeks: 36,
}

function defaultBirthdate() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  displayName: DEFAULTS.displayName,
  avatarUri: DEFAULTS.avatarUri,
  babyName: DEFAULTS.babyName,
  birthdate: defaultBirthdate(),
  gender: DEFAULTS.gender,
  birthWeightG: DEFAULTS.birthWeightG,
  birthLengthCm: DEFAULTS.birthLengthCm,
  feedingPreference: DEFAULTS.feedingPreference,
  isPremature: DEFAULTS.isPremature,
  gestationalWeeks: DEFAULTS.gestationalWeeks,
  update: (fields) => set((s) => ({ ...s, ...fields })),
  reset: () =>
    set({
      displayName: DEFAULTS.displayName,
      avatarUri: DEFAULTS.avatarUri,
      babyName: DEFAULTS.babyName,
      birthdate: defaultBirthdate(),
      gender: DEFAULTS.gender,
      birthWeightG: DEFAULTS.birthWeightG,
      birthLengthCm: DEFAULTS.birthLengthCm,
      feedingPreference: DEFAULTS.feedingPreference,
      isPremature: DEFAULTS.isPremature,
      gestationalWeeks: DEFAULTS.gestationalWeeks,
    }),
}))
