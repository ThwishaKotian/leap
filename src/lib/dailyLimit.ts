/**
 * Demo-only daily limit: a student can see up to DAILY_ALUMNI_LIMIT *different* alumni per calendar day.
 *
 * Stored in this browser's localStorage, so it is client-side enforcement for the prototype,
 * not abuse prevention: clearing site data (or the "reset" button) restores the allowance.
 * Production would enforce this server-side against a signed-in account.
 *
 * Rules:
 * - An alumnus counts once per day, when a search actually shows them. Page loads count nothing.
 * - Seeing the same alumni again the same day is free (re-running a search never locks you out).
 * - The allowance resets at local midnight.
 * - If storage is unavailable (private mode, blocked cookies), we fail open rather than block.
 */
import { DAILY_ALUMNI_LIMIT } from '../config'

export const STORAGE_KEY = 'alumni-match:daily-usage:v1'

export interface DailyUsage {
  /** Local calendar date, YYYY-MM-DD */
  date: string
  /** Distinct alumni shown on that date */
  alumniIds: string[]
}

export type AllowanceCheck =
  | { allowed: true; newIds: string[] }
  | { allowed: false; newIds: string[]; remaining: number }

/** Minimal Storage subset, so tests can pass a fake. */
export type UsageStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function todayKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** localStorage if this browser exposes it, otherwise null. Read-only check; writes are guarded where they happen. */
export function browserStorage(): UsageStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    // Accessing localStorage throws when site data is blocked.
    return null
  }
}

function isUsage(value: unknown): value is DailyUsage {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.date === 'string' && Array.isArray(v.alumniIds) && v.alumniIds.every((id) => typeof id === 'string')
}

/** Today's usage. Anything missing, corrupt or from an earlier day reads as a fresh allowance. */
export function readUsage(storage: UsageStorage | null, now: Date = new Date()): DailyUsage {
  const fresh: DailyUsage = { date: todayKey(now), alumniIds: [] }
  if (!storage) return fresh
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    return isUsage(parsed) && parsed.date === fresh.date ? parsed : fresh
  } catch {
    return fresh
  }
}

export function remaining(usage: DailyUsage): number {
  return Math.max(0, DAILY_ALUMNI_LIMIT - usage.alumniIds.length)
}

/** Can these alumni be shown? Only alumni not already seen today cost anything. */
export function checkAllowance(usage: DailyUsage, alumniIds: string[]): AllowanceCheck {
  const newIds = [...new Set(alumniIds)].filter((id) => !usage.alumniIds.includes(id))
  const left = remaining(usage)
  return newIds.length <= left ? { allowed: true, newIds } : { allowed: false, newIds, remaining: left }
}

/** Record alumni as shown today and return the updated usage. Storage failures are ignored (fail open). */
export function recordShown(usage: DailyUsage, alumniIds: string[], storage: UsageStorage | null): DailyUsage {
  const updated: DailyUsage = { date: usage.date, alumniIds: [...new Set([...usage.alumniIds, ...alumniIds])] }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Quota or privacy errors: keep the in-memory count for this session only.
  }
  return updated
}

export function resetUsage(storage: UsageStorage | null, now: Date = new Date()): DailyUsage {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to clear.
  }
  return { date: todayKey(now), alumniIds: [] }
}
