import { SIGNAL_WEIGHTS, STRONG_MATCH_THRESHOLD } from '../config'
import type { MatchResult, SignalKey, Snapshot } from '../types'
import { canonicalCity, cityLabel, countryLabel, countryOfCity, industryLabel, streamLabel } from './normalize'

export const SIGNALS: { key: SignalKey; label: string; description: string }[] = [
  { key: 'skills', label: 'Skills', description: 'How many of your skills they also had' },
  { key: 'industry', label: 'Industry', description: 'Same industry, or half credit for a related one' },
  { key: 'experience', label: 'Experience', description: 'How close your years of experience are (5+ years apart scores 0)' },
  { key: 'city', label: 'City', description: 'Same city, or half credit for the same country' },
  { key: 'extracurriculars', label: 'Extracurriculars', description: 'Activities you have in common' },
]

export function weightPercent(key: SignalKey): number {
  return Math.round(SIGNAL_WEIGHTS[key] * 100)
}

/** Points a result earned for one signal, out of weightPercent(key). */
export function signalPoints(result: MatchResult, key: SignalKey): number {
  return Math.round(SIGNAL_WEIGHTS[key] * result.breakdown[key] * 100)
}

export function matchStrength(score: number): string {
  if (score >= 75) return 'Very similar start'
  if (score >= STRONG_MATCH_THRESHOLD) return 'Strong match'
  if (score >= 40) return 'Some overlap'
  return 'Loose match'
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]
}

/** "A", "A and B", "A, B and C" */
export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function yearsPhrase(years: number): string {
  if (years === 0) return 'no full-time experience'
  return years === 1 ? '1 year of experience' : `${years} years of experience`
}

/** One plain-language reason per signal that contributed, phrased to follow "Before their degree, <name>…". */
function reasonFor(key: SignalKey, result: MatchResult, student: Snapshot): string | null {
  const pre = result.alumnus.preStudy
  const value = result.breakdown[key]
  if (value === 0) return null
  switch (key) {
    case 'skills': {
      const skills = result.sharedSkills
      const shown = skills.slice(0, 3)
      const more = skills.length - shown.length
      return `used ${listPhrase(more > 0 ? [...shown, `${more} more of your skills`] : shown)}`
    }
    case 'industry':
      return value === 1
        ? `worked in ${industryLabel(pre.industry)}, like you`
        : `worked in ${industryLabel(pre.industry)}, close to your ${industryLabel(student.industry)} background`
    case 'experience':
      return pre.yearsExp === student.yearsExp
        ? `had ${yearsPhrase(pre.yearsExp)}, same as you`
        : `had ${yearsPhrase(pre.yearsExp)} (you have ${student.yearsExp})`
    case 'city':
      return value === 1 ? `lived in ${cityLabel(pre.city)}, like you` : `lived in ${cityLabel(pre.city)}, also in ${countryLabel(countryOfCity(canonicalCity(pre.city)) ?? '')}`
    case 'extracurriculars':
      return `did ${listPhrase(result.sharedExtracurriculars)}, like you`
  }
}

/** Top reasons, ordered by how many points each signal contributed. */
export function matchReasons(result: MatchResult, student: Snapshot, limit = 3): string[] {
  return SIGNALS.map(({ key }) => ({ key, points: SIGNAL_WEIGHTS[key] * result.breakdown[key] }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(({ key }) => reasonFor(key, result, student))
    .filter((reason): reason is string => reason !== null)
}

/** For fallback results: what they actually studied, stated plainly. Null for exact matches. */
export function fallbackNote(result: MatchResult, requested: { stream: string; country: string }): string | null {
  const studied = `${streamLabel(result.alumnus.stream)} in ${countryLabel(result.alumnus.country)}`
  if (result.tier === 'any-country') {
    return `Studied ${studied}, not ${countryLabel(requested.country)}.`
  }
  if (result.tier === 'related-stream') {
    return `Studied ${studied}: a related subject, not ${streamLabel(requested.stream)}.`
  }
  return null
}
