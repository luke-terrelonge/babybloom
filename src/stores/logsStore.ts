import { create } from 'zustand'
import type { FeedingLog, SleepLog, DiaperLog, GrowthRecord } from '@/types'

interface LogsState {
  feedingLogs: FeedingLog[]
  sleepLogs: SleepLog[]
  diaperLogs: DiaperLog[]
  growthRecords: GrowthRecord[]
  setFeedingLogs: (logs: FeedingLog[]) => void
  setSleepLogs: (logs: SleepLog[]) => void
  setDiaperLogs: (logs: DiaperLog[]) => void
  setGrowthRecords: (records: GrowthRecord[]) => void
  addFeedingLog: (log: FeedingLog) => void
  addSleepLog: (log: SleepLog) => void
  addDiaperLog: (log: DiaperLog) => void
  addGrowthRecord: (record: GrowthRecord) => void
  removeFeedingLog: (id: string) => void
  removeSleepLog: (id: string) => void
  removeDiaperLog: (id: string) => void
  clearLogs: () => void
}

export const useLogsStore = create<LogsState>((set) => ({
  feedingLogs: [],
  sleepLogs: [],
  diaperLogs: [],
  growthRecords: [],
  setFeedingLogs: (logs) => set({ feedingLogs: logs }),
  setSleepLogs: (logs) => set({ sleepLogs: logs }),
  setDiaperLogs: (logs) => set({ diaperLogs: logs }),
  setGrowthRecords: (records) => set({ growthRecords: records }),
  addFeedingLog: (log) => set((s) => ({ feedingLogs: [log, ...s.feedingLogs] })),
  addSleepLog: (log) => set((s) => ({ sleepLogs: [log, ...s.sleepLogs] })),
  addDiaperLog: (log) => set((s) => ({ diaperLogs: [log, ...s.diaperLogs] })),
  addGrowthRecord: (record) => set((s) => ({ growthRecords: [record, ...s.growthRecords] })),
  removeFeedingLog: (id) => set((s) => ({ feedingLogs: s.feedingLogs.filter((l) => l.id !== id) })),
  removeSleepLog: (id) => set((s) => ({ sleepLogs: s.sleepLogs.filter((l) => l.id !== id) })),
  removeDiaperLog: (id) => set((s) => ({ diaperLogs: s.diaperLogs.filter((l) => l.id !== id) })),
  clearLogs: () => set({ feedingLogs: [], sleepLogs: [], diaperLogs: [], growthRecords: [] }),
}))
