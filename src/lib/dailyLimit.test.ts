import { describe, expect, it } from 'vitest'
import { DAILY_ALUMNI_LIMIT } from '../config'
import {
  checkAllowance,
  readUsage,
  recordShown,
  remaining,
  resetUsage,
  STORAGE_KEY,
  todayKey,
  type UsageStorage,
} from './dailyLimit'

function memoryStorage(initial: Record<string, string> = {}): UsageStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  }
}

const throwingStorage: UsageStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

const MAY_1 = new Date(2026, 4, 1, 9, 0)
const MAY_1_LATE = new Date(2026, 4, 1, 23, 59)
const MAY_2 = new Date(2026, 4, 2, 0, 1)

describe('daily limit', () => {
  it('is the static 3 from the brief', () => {
    expect(DAILY_ALUMNI_LIMIT).toBe(3)
  })

  it('uses the local calendar date', () => {
    expect(todayKey(MAY_1)).toBe('2026-05-01')
    expect(todayKey(MAY_1_LATE)).toBe('2026-05-01')
    expect(todayKey(MAY_2)).toBe('2026-05-02')
  })

  it('starts with the full allowance when nothing is stored', () => {
    const usage = readUsage(memoryStorage(), MAY_1)
    expect(usage).toEqual({ date: '2026-05-01', alumniIds: [] })
    expect(remaining(usage)).toBe(3)
  })

  it('counts distinct alumni when they are shown, and persists them', () => {
    const storage = memoryStorage()
    const usage = recordShown(readUsage(storage, MAY_1), ['a', 'b', 'c'], storage)
    expect(remaining(usage)).toBe(0)
    expect(JSON.parse(storage.data[STORAGE_KEY])).toEqual({ date: '2026-05-01', alumniIds: ['a', 'b', 'c'] })
    expect(readUsage(storage, MAY_1_LATE)).toEqual(usage)
  })

  it('seeing the same alumni again is free, even at the limit', () => {
    const storage = memoryStorage()
    const usage = recordShown(readUsage(storage, MAY_1), ['a', 'b', 'c'], storage)
    expect(checkAllowance(usage, ['c', 'a', 'b'])).toEqual({ allowed: true, newIds: [] })
    expect(remaining(recordShown(usage, ['a', 'b', 'c'], storage))).toBe(0)
  })

  it('blocks a search that would show more new alumni than remain', () => {
    const usage = { date: '2026-05-01', alumniIds: ['a'] }
    expect(checkAllowance(usage, ['b', 'c'])).toEqual({ allowed: true, newIds: ['b', 'c'] })
    expect(checkAllowance(usage, ['b', 'c', 'd'])).toEqual({ allowed: false, newIds: ['b', 'c', 'd'], remaining: 2 })
    expect(checkAllowance(usage, ['a', 'b', 'c'])).toEqual({ allowed: true, newIds: ['b', 'c'] })
  })

  it('a search that shows nobody costs nothing', () => {
    const usage = { date: '2026-05-01', alumniIds: ['a', 'b', 'c'] }
    expect(checkAllowance(usage, [])).toEqual({ allowed: true, newIds: [] })
  })

  it('resets on a new day', () => {
    const storage = memoryStorage()
    recordShown(readUsage(storage, MAY_1), ['a', 'b', 'c'], storage)
    const nextDay = readUsage(storage, MAY_2)
    expect(nextDay).toEqual({ date: '2026-05-02', alumniIds: [] })
    expect(remaining(nextDay)).toBe(3)
  })

  it('treats corrupt or unexpected stored data as a fresh allowance', () => {
    for (const bad of ['not json', '42', '{"date":"2026-05-01"}', '{"date":"2026-05-01","alumniIds":[1,2]}']) {
      expect(readUsage(memoryStorage({ [STORAGE_KEY]: bad }), MAY_1).alumniIds).toEqual([])
    }
  })

  it('fails open when storage is unavailable or throws', () => {
    for (const storage of [null, throwingStorage]) {
      const usage = readUsage(storage, MAY_1)
      expect(remaining(usage)).toBe(3)
      const after = recordShown(usage, ['a', 'b'], storage)
      expect(remaining(after)).toBe(1)
      expect(resetUsage(storage, MAY_1)).toEqual({ date: '2026-05-01', alumniIds: [] })
    }
  })

  it('reset clears today’s usage', () => {
    const storage = memoryStorage()
    recordShown(readUsage(storage, MAY_1), ['a', 'b', 'c'], storage)
    expect(remaining(resetUsage(storage, MAY_1))).toBe(3)
    expect(storage.data[STORAGE_KEY]).toBeUndefined()
    expect(remaining(readUsage(storage, MAY_1))).toBe(3)
  })
})
