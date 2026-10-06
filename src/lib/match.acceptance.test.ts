/**
 * Phase 2 acceptance checks, numbered to match the review checklist.
 * Where possible each check runs over every demo profile × every stream × every country,
 * not just one hand-picked example.
 */
import { describe, expect, it } from 'vitest'
import { RESULTS_PER_SEARCH, SIGNAL_WEIGHTS } from '../config'
import { ALUMNI } from '../data/alumni'
import { DEMO_PROFILES } from '../data/demoProfiles'
import { COUNTRIES, STREAMS } from '../data/synonyms'
import type { Alumnus, MatchQuery, MatchTier, Snapshot } from '../types'
import { findMatches, scoreSnapshot } from './match'
import { canonicalCity, canonicalCountry, canonicalStream } from './normalize'

const TIER_RANK: Record<MatchTier, number> = { exact: 0, 'any-country': 1, 'related-stream': 2 }

function demo(name: string) {
  const found = DEMO_PROFILES.find((d) => d.profile.name === name)
  if (!found) throw new Error(`No demo profile named ${name}`)
  return found
}

/** Every demo student × every stream × every country, searched from the student's own city. */
const ALL_SEARCHES: { student: Snapshot; query: MatchQuery; label: string }[] = DEMO_PROFILES.flatMap((d) =>
  Object.values(STREAMS).flatMap((stream) =>
    Object.values(COUNTRIES).map((country) => ({
      student: d.profile,
      query: { stream: stream.label, country: country.label, city: d.profile.city },
      label: `${d.profile.name} / ${stream.label} / ${country.label}`,
    })),
  ),
)

function isExactFor(alumnus: Alumnus, query: MatchQuery): boolean {
  return (
    canonicalStream(alumnus.stream) === canonicalStream(query.stream) &&
    canonicalCountry(alumnus.country) === canonicalCountry(query.country)
  )
}

describe('1. Riya Deshpande + MS in Data Science + Germany + Bangalore', () => {
  const { results, status, exactCount } = findMatches(demo('Riya Deshpande').profile, {
    stream: 'MS in Data Science',
    country: 'Germany',
    city: 'Bangalore',
  })

  it('returns exactly 3 results, all exact', () => {
    expect(results).toHaveLength(3)
    expect(status).toBe('complete')
    expect(exactCount).toBe(3)
    expect(results.every((r) => r.tier === 'exact' && !r.isFallback)).toBe(true)
  })

  it('every result really studied Data Science in Germany', () => {
    for (const { alumnus } of results) {
      expect(canonicalStream(alumnus.stream), alumnus.id).toBe('data-science')
      expect(canonicalCountry(alumnus.country), alumnus.id).toBe('germany')
    }
  })
})

describe('2. Tejas Rao + MS in Computer Science + United States + Hyderabad', () => {
  const { results, status, exactCount } = findMatches(demo('Tejas Rao').profile, {
    stream: 'MS in Computer Science',
    country: 'United States',
    city: 'Hyderabad',
  })

  it('returns exactly 3 results, all exact', () => {
    expect(results).toHaveLength(3)
    expect(status).toBe('complete')
    expect(exactCount).toBe(3)
    expect(results.every((r) => r.tier === 'exact' && !r.isFallback)).toBe(true)
  })

  it('every result really studied Computer Science in the United States', () => {
    for (const { alumnus } of results) {
      expect(canonicalStream(alumnus.stream), alumnus.id).toBe('computer-science')
      expect(canonicalCountry(alumnus.country), alumnus.id).toBe('united-states')
    }
  })
})

describe('3. Stream aliases normalise to the same stream', () => {
  it('MS Data Science = M.Sc. Data Science = MS in Data Science', () => {
    const ids = ['MS Data Science', 'M.Sc. Data Science', 'MS in Data Science'].map(canonicalStream)
    expect(new Set(ids)).toEqual(new Set(['data-science']))
  })

  it('and the alias used in the search does not change the results', () => {
    const student = demo('Riya Deshpande').profile
    const [a, b, c] = ['MS Data Science', 'M.Sc. Data Science', 'MS in Data Science'].map((stream) =>
      findMatches(student, { stream, country: 'Germany', city: 'Bangalore' }),
    )
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })
})

describe('4. Bangalore and Bengaluru normalise to the same city', () => {
  it('canonical ids match', () => {
    expect(canonicalCity('Bangalore')).toBe(canonicalCity('Bengaluru'))
  })

  it('and both get full city credit against each other', () => {
    const student = demo('Riya Deshpande').profile
    const a = findMatches(student, { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' })
    const b = findMatches(student, { stream: 'MS in Data Science', country: 'Germany', city: 'Bengaluru' })
    expect(b).toEqual(a)
  })
})

describe('5. Deutschland normalises to Germany', () => {
  it('canonical ids match', () => {
    expect(canonicalCountry('Deutschland')).toBe(canonicalCountry('Germany'))
  })

  it('and returns the same results as "Germany"', () => {
    const student = demo('Riya Deshpande').profile
    const a = findMatches(student, { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' })
    const b = findMatches(student, { stream: 'MS in Data Science', country: 'Deutschland', city: 'Bangalore' })
    expect(b).toEqual(a)
  })
})

describe('6. Scores are deterministic and always 0–100', () => {
  it(`every score is an integer in [0, 100] across ${ALL_SEARCHES.length} searches`, () => {
    let checked = 0
    for (const { student, query, label } of ALL_SEARCHES) {
      for (const r of findMatches(student, query).results) {
        expect(Number.isInteger(r.score), label).toBe(true)
        expect(r.score, label).toBeGreaterThanOrEqual(0)
        expect(r.score, label).toBeLessThanOrEqual(100)
        for (const value of Object.values(r.breakdown)) {
          expect(value, label).toBeGreaterThanOrEqual(0)
          expect(value, label).toBeLessThanOrEqual(1)
        }
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('hits the bounds: identical snapshot = 100, nothing in common = 0', () => {
    const student = demo('Riya Deshpande').profile
    expect(Math.round(scoreSnapshot(student, student).raw * 100)).toBe(100)
    const opposite: Snapshot = {
      skills: ['Welding'],
      industry: 'Agriculture',
      yearsExp: 20,
      city: 'Reykjavik',
      extracurriculars: ['Sailing'],
    }
    expect(scoreSnapshot(student, opposite).raw).toBe(0)
  })

  it('same input gives the same output, every run', () => {
    for (const { student, query } of ALL_SEARCHES) {
      expect(findMatches(student, query)).toEqual(findMatches(student, query))
    }
  })

  it('result does not depend on the order of the dataset', () => {
    const reversed = [...ALUMNI].reverse()
    for (const { student, query, label } of ALL_SEARCHES) {
      expect(findMatches(student, query, reversed), label).toEqual(findMatches(student, query, ALUMNI))
    }
  })
})

describe('7. Weights sum to 100%', () => {
  it('matches the agreed split exactly', () => {
    expect(SIGNAL_WEIGHTS).toEqual({ skills: 0.35, industry: 0.2, experience: 0.2, city: 0.15, extracurriculars: 0.1 })
  })

  it('sums to 100%', () => {
    const percent = Object.values(SIGNAL_WEIGHTS).reduce((sum, w) => sum + Math.round(w * 100), 0)
    expect(percent).toBe(100)
  })
})

describe('8. Only the alumnus preStudy snapshot is used for similarity', () => {
  const student = demo('Riya Deshpande').profile
  const query = { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' }
  const preStudy: Snapshot = {
    skills: ['Python', 'SQL'],
    industry: 'Banking',
    yearsExp: 2,
    city: 'Pune',
    extracurriculars: ['Debate'],
  }
  const base: Alumnus = {
    id: 'base',
    name: 'Base',
    stream: 'MS in Data Science',
    country: 'Germany',
    university: 'Uni A',
    gradYear: 2020,
    currentRole: 'Intern',
    preStudy,
    contacts: [],
  }

  it('changing everything except preStudy leaves the score unchanged', () => {
    // The post-study fields here deliberately look like a perfect match for the student.
    const sameStart: Alumnus = {
      ...base,
      id: 'post-study-changed',
      name: 'Someone Else',
      stream: 'M.Sc. Data Science',
      university: 'Uni B',
      gradYear: 2025,
      currentRole: 'Head of Machine Learning at a Bangalore fintech (Python, SQL, Tableau, Kaggle)',
      contacts: [{ kind: 'linkedin', value: 'https://www.linkedin.com/in/x', source: 'public-profile' }],
    }
    const [a, b] = findMatches(student, query, [base, sameStart]).results
    expect(a.breakdown).toEqual(b.breakdown)
    expect(a.score).toBe(b.score)
  })

  it('changing preStudy does change the score (control)', () => {
    const betterStart: Alumnus = { ...base, id: 'better', preStudy: { ...preStudy, city: 'Bangalore' } }
    const scores = Object.fromEntries(
      findMatches(student, query, [base, betterStart]).results.map((r) => [r.alumnus.id, r.score]),
    )
    expect(scores.better).toBeGreaterThan(scores.base)
  })
})

describe('9. Exact stream + country matches always rank above fallbacks', () => {
  it('holds across every search on the real dataset', () => {
    for (const { student, query, label } of ALL_SEARCHES) {
      const ranks = findMatches(student, query).results.map((r) => TIER_RANK[r.tier])
      expect(ranks, label).toEqual([...ranks].sort((a, b) => a - b))
    }
  })

  it('holds even when the fallback is a perfect match and the exact match scores 0', () => {
    const student = demo('Riya Deshpande').profile
    const query = { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' }
    const weakExact: Alumnus = {
      ...ALUMNI[0],
      id: 'weak-exact',
      preStudy: { skills: [], industry: 'Agriculture', yearsExp: 20, city: 'Reykjavik', extracurriculars: [] },
    }
    const perfectOtherCountry: Alumnus = { ...ALUMNI[0], id: 'perfect-uk', country: 'United Kingdom', preStudy: student }
    const perfectRelated: Alumnus = { ...ALUMNI[0], id: 'perfect-ba', stream: 'MSc Business Analytics', preStudy: student }

    const { results } = findMatches(student, query, [perfectRelated, perfectOtherCountry, weakExact])
    expect(results.map((r) => [r.alumnus.id, r.score, r.tier])).toEqual([
      ['weak-exact', 0, 'exact'],
      ['perfect-uk', 100, 'any-country'],
      ['perfect-ba', 100, 'related-stream'],
    ])
  })

  it('fallbacks only appear when there are fewer than 3 exact matches', () => {
    for (const { student, query, label } of ALL_SEARCHES) {
      const exactAvailable = ALUMNI.filter((a) => isExactFor(a, query)).length
      const { results } = findMatches(student, query)
      if (exactAvailable >= RESULTS_PER_SEARCH) {
        expect(results.some((r) => r.isFallback), label).toBe(false)
      }
    }
  })
})

describe('10. Limited-match cases are clearly marked', () => {
  it('Aniket Jadhav + MS Mechanical Engineering + Germany: 2 exact + 1 labelled fallback', () => {
    const { results, status, exactCount } = findMatches(demo('Aniket Jadhav').profile, {
      stream: 'MS in Mechanical Engineering',
      country: 'Germany',
      city: 'Pune',
    })
    expect(status).toBe('limited')
    expect(exactCount).toBe(2)
    expect(results.map((r) => [r.alumnus.id, r.tier, r.isFallback])).toEqual([
      ['me-de-01', 'exact', false],
      ['me-de-02', 'exact', false],
      ['me-us-01', 'any-country', true],
    ])
    expect(canonicalCountry(results[2].alumnus.country)).not.toBe('germany')
  })

  it('across every search: labels are truthful and status matches the exact count', () => {
    for (const { student, query, label } of ALL_SEARCHES) {
      const { results, status, exactCount } = findMatches(student, query)
      for (const r of results) {
        // A result is labelled exact if and only if it really matches stream + country.
        expect(r.tier === 'exact', `${label}: ${r.alumnus.id}`).toBe(isExactFor(r.alumnus, query))
        expect(r.isFallback, `${label}: ${r.alumnus.id}`).toBe(r.tier !== 'exact')
      }
      expect(exactCount, label).toBe(results.filter((r) => !r.isFallback).length)
      expect(status, label).toBe(exactCount === RESULTS_PER_SEARCH ? 'complete' : 'limited')
      expect(results.length, label).toBeLessThanOrEqual(RESULTS_PER_SEARCH)
    }
  })

  it('a stream with no alumni returns 0 results and "limited", not unrelated people', () => {
    const { results, status } = findMatches(demo('Riya Deshpande').profile, {
      stream: 'MS in Marine Biology',
      country: 'Germany',
      city: 'Bangalore',
    })
    expect(results).toEqual([])
    expect(status).toBe('limited')
  })
})
