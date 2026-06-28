import { create } from 'zustand'
import type { Baby, BabyMember } from '@/types'

interface BabyState {
  activeBaby: Baby | null
  babies: Baby[]
  members: BabyMember[]
  setActiveBaby: (baby: Baby | null) => void
  setBabies: (babies: Baby[]) => void
  setMembers: (members: BabyMember[]) => void
  updateActiveBaby: (updates: Partial<Baby>) => void
}

export const useBabyStore = create<BabyState>((set, get) => ({
  activeBaby: null,
  babies: [],
  members: [],
  setActiveBaby: (baby) => set({ activeBaby: baby }),
  setBabies: (babies) => set({ babies }),
  setMembers: (members) => set({ members }),
  updateActiveBaby: (updates) => {
    const current = get().activeBaby
    if (!current) return
    const updated = { ...current, ...updates }
    set({
      activeBaby: updated,
      babies: get().babies.map((b) => (b.id === updated.id ? updated : b)),
    })
  },
}))
