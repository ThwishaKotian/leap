import { MAX_EXPERIENCE_GAP, RESULTS_PER_SEARCH, SIGNAL_WEIGHTS } from '../config'
import { ALUMNI } from '../data/alumni'
import type { Alumnus, MatchQuery, MatchResponse, MatchResult, MatchTier, SignalKey, Snapshot } from '../types'
import {
  canonicalCity,
  canonicalCountry,
  canonicalExtracurricular,
  canonicalIndustry,
  canonicalSet,
  canonicalSkill,
  canonicalStream,
  countryOfCity,
  industriesRelated,
  relatedStreams,
} from './normalize'

// ── Signal similarities, each 0–1 ─────────────────────────────────────────

/** Sørensen–Dice overlap: 2|A∩B| / (|A|+|B|). Symmetric, and gentler than Jaccard on short lists. */
export function diceSimilarity(a: Map<string, string>, b: Map<string, string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const key of a.keys()) if (b.has(key)) shared++
  return (2 * shared) / (a.size + b.size)
}

/** Same industry = 1, related (shared group, e.g. Fintech and Banking) = 0.5, else 0. */
export function industrySimilarity(a: string, b: string): number {
  const ca = canonicalIndustry(a)
  const cb = canonicalIndustry(b)
  if (ca === cb) return 1
  return industriesRelated(ca, cb) ? 0.5 : 0
}

/** Linear falloff: identical = 1, MAX_EXPERIENCE_GAP years or more apart = 0. */
export function experienceSimilarity(a: number, b: number): number {
  return Math.max(0, 1 - Math.abs(a - b) / MAX_EXPERIENCE_GAP)
}

/** Same city = 1, different cities in the same country = 0.5, else 0. */
export function citySimilarity(a: string, b: string): number {
  const ca = canonicalCity(a)
  const cb = canonicalCity(b)
  if (ca === cb) return 1
  const countryA = countryOfCity(ca)
  return countryA !== undefined && countryA === countryOfCity(cb) ? 0.5 : 0
}

// ── Scoring ───────────────────────────────────────────────────────────────

export interface Score {
  /** Weighted sum, 0–1, unrounded (used for sorting) */
  raw: number
  breakdown: Record<SignalKey, number>
  sharedSkills: string[]
  sharedExtracurriculars: string[]
}

function shared(a: Map<string, string>, b: Map<string, string>): string[] {
  return [...b].filter(([key]) => a.has(key)).map(([, label]) => label)
}

/** Compare a student with an alumnus's pre-study snapshot. Nothing after the alumnus's degree is used. */
export function scoreSnapshot(student: Snapshot, preStudy: Snapshot): Score {
  const studentSkills = canonicalSet(student.skills, canonicalSkill)
  const alumnusSkills = canonicalSet(preStudy.skills, canonicalSkill)
  const studentExtras = canonicalSet(student.extracurriculars, canonicalExtracurricular)
  const alumnusExtras = canonicalSet(preStudy.extracurriculars, canonicalExtracurricular)

  const breakdown: Record<SignalKey, number> = {
    skills: diceSimilarity(studentSkills, alumnusSkills),
    industry: industrySimilarity(student.industry, preStudy.industry),
    experience: experienceSimilarity(student.yearsExp, preStudy.yearsExp),
    city: citySimilarity(student.city, preStudy.city),
    extracurriculars: diceSimilarity(studentExtras, alumnusExtras),
  }
  const raw = (Object.keys(SIGNAL_WEIGHTS) as SignalKey[]).reduce(
    (sum, key) => sum + SIGNAL_WEIGHTS[key] * breakdown[key],
    0,
  )
  return {
    raw,
    breakdown,
    sharedSkills: shared(studentSkills, alumnusSkills),
    sharedExtracurriculars: shared(studentExtras, alumnusExtras),
  }
}

// ── Filtering into tiers ──────────────────────────────────────────────────

const TIER_ORDER: MatchTier[] = ['exact', 'any-country', 'related-stream']

/** Which tier an alumnus falls into for this search, or null if it isn't a candidate at all. */
export function tierFor(alumnus: Alumnus, streamId: string, countryId: string): MatchTier | null {
  const alumnusStream = canonicalStream(alumnus.stream)
  const sameCountry = canonicalCountry(alumnus.country) === countryId
  if (alumnusStream === streamId) return sameCountry ? 'exact' : 'any-country'
  if (sameCountry && relatedStreams(streamId).includes(alumnusStream)) return 'related-stream'
  return null
}

/**
 * Find the 3 alumni most similar to the student for this stream + country.
 *
 * 1. Hard filter: same stream AND same country ("exact").
 * 2. Score every candidate's pre-study snapshot against the student.
 * 3. Sort by tier, then score (descending), then id (so ties are stable).
 * 4. Take 3. Fallback tiers only appear when fewer than 3 exact matches exist,
 *    and are marked isFallback with status "limited".
 *
 * The city typed in the form overrides the city on the student's profile.
 */
export function findMatches(student: Snapshot, query: MatchQuery, alumni: Alumnus[] = ALUMNI): MatchResponse {
  const streamId = canonicalStream(query.stream)
  const countryId = canonicalCountry(query.country)
  const studentSnapshot: Snapshot = { ...student, city: query.city.trim() || student.city }

  const candidates: { result: MatchResult; raw: number }[] = []
  for (const alumnus of alumni) {
    const tier = tierFor(alumnus, streamId, countryId)
    if (!tier) continue
    const { raw, breakdown, sharedSkills, sharedExtracurriculars } = scoreSnapshot(studentSnapshot, alumnus.preStudy)
    candidates.push({
      raw,
      result: {
        alumnus,
        score: Math.round(raw * 100),
        breakdown,
        tier,
        isFallback: tier !== 'exact',
        sharedSkills,
        sharedExtracurriculars,
      },
    })
  }

  candidates.sort(
    (a, b) =>
      TIER_ORDER.indexOf(a.result.tier) - TIER_ORDER.indexOf(b.result.tier) ||
      b.raw - a.raw ||
      a.result.alumnus.id.localeCompare(b.result.alumnus.id),
  )

  const results = candidates.slice(0, RESULTS_PER_SEARCH).map((c) => c.result)
  const exactCount = results.filter((r) => !r.isFallback).length
  return { results, exactCount, status: exactCount === RESULTS_PER_SEARCH ? 'complete' : 'limited' }
}
