import { differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns'

export function getCorrectedBirthdate(birthdate: string, gestationalWeeks: number): string {
  const birth = new Date(birthdate)
  const weeksPreterm = 40 - gestationalWeeks
  const corrected = new Date(birth)
  corrected.setDate(birth.getDate() + weeksPreterm * 7)
  return corrected.toISOString().split('T')[0]
}

export function getBabyAgeInDays(birthdate: string, correctedBirthdate?: string): number {
  const ref = correctedBirthdate ? new Date(correctedBirthdate) : new Date(birthdate)
  return differenceInDays(new Date(), ref)
}

export function formatBabyAge(birthdate: string, correctedBirthdate?: string): string {
  const ref = correctedBirthdate ? new Date(correctedBirthdate) : new Date(birthdate)
  const days = differenceInDays(new Date(), ref)
  if (days < 7) return `${days}d`
  const weeks = differenceInWeeks(new Date(), ref)
  if (weeks < 8) return `${weeks}w`
  const months = differenceInMonths(new Date(), ref)
  if (months < 24) return `${months}mo`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`
}

export function gramsToLbsOz(grams: number): { lbs: number; oz: number } {
  const totalOz = grams / 28.3495
  const lbs = Math.floor(totalOz / 16)
  const oz = Math.round((totalOz % 16) * 10) / 10
  return { lbs, oz }
}

export function lbsOzToGrams(lbs: number, oz: number): number {
  return Math.round((lbs * 16 + oz) * 28.3495)
}

export function cmToInches(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10
}

export function mlToOz(ml: number): number {
  return Math.round((ml / 29.5735) * 10) / 10
}

export function ozToMl(oz: number): number {
  return Math.round(oz * 29.5735)
}

export function minutesToHoursLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}
