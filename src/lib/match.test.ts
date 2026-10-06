import { describe, expect, it } from 'vitest'
import { SIGNAL_WEIGHTS } from '../config'
import { ALUMNI } from '../data/alumni'
import { DEMO_PROFILES, findDemoProfile } from '../data/demoProfiles'
import type { Alumnus, Snapshot } from '../types'
import {
  citySimilarity,
  diceSimilarity,
  experienceSimilarity,
  findMatches,
  industrySimilarity,
  scoreSnapshot,
} from './match'
import { canonicalCountry, canonicalStream, isKnownCountry, isKnownStream } from './normalize'

const set = (...items: string[]) => new Map(items.map((i) => [i, i]))

const baseSnapshot: Snapshot = {
  skills: ['Python', 'SQL'],
  industry: 'Fintech',
  yearsExp: 3,
  city: 'Bangalore',
  extracurriculars: ['Kaggle'],
}

function alumnus(id: string, overrides: Partial<Alumnus> = {}): Alumnus {
  return {
    id,
    name: `Test ${id}`,
    stream: 'MS in Data Science',
    country: 'Germany',
    university: 'Test University',
    gradYear: 2024,
    currentRole: 'Test role',
    preStudy: baseSnapshot,
    contacts: [],
    ...overrides,
  }
}

describe('signal similarities', () => {
  it('diceSimilarity', () => {
    expect(diceSimilarity(set('a', 'b'), set('a', 'b'))).toBe(1)
    expect(diceSimilarity(set('a', 'b'), set('b', 'c'))).toBe(0.5)
    expect(diceSimilarity(set('a'), set())).toBe(0)
  })

  it('industrySimilarity gives half credit to related industries', () => {
    expect(industrySimilarity('Fintech', 'payments')).toBe(1)
    expect(industrySimilarity('Fintech', 'Banking')).toBe(0.5)
    expect(industrySimilarity('Banking', 'Automotive')).toBe(0)
  })

  it('experienceSimilarity falls off linearly to 0 at a 5-year gap', () => {
    expect(experienceSimilarity(3, 3)).toBe(1)
    expect(experienceSimilarity(3, 5)).toBeCloseTo(0.6)
    expect(experienceSimilarity(0, 7)).toBe(0)
  })

  it('citySimilarity: same city 1, same country 0.5, unknown 0', () => {
    expect(citySimilarity('Bangalore', 'Bengaluru')).toBe(1)
    expect(citySimilarity('Bangalore', 'Pune')).toBe(0.5)
    expect(citySimilarity('Bangalore', 'Springfield')).toBe(0)
  })
})

describe('scoreSnapshot', () => {
  it('identical snapshots score 1', () => {
    expect(scoreSnapshot(baseSnapshot, baseSnapshot).raw).toBeCloseTo(1)
  })

  it('is the weighted sum of the breakdown', () => {
    const { raw, breakdown } = scoreSnapshot(baseSnapshot, {
      skills: ['python', 'Java'],
      industry: 'Banking',
      yearsExp: 1,
      city: 'Pune',
      extracurriculars: [],
    })
    expect(breakdown).toEqual({ skills: 0.5, industry: 0.5, experience: 0.6, city: 0.5, extracurriculars: 0 })
    const expected =
      SIGNAL_WEIGHTS.skills * 0.5 +
      SIGNAL_WEIGHTS.industry * 0.5 +
      SIGNAL_WEIGHTS.experience * 0.6 +
      SIGNAL_WEIGHTS.city * 0.5
    expect(raw).toBeCloseTo(expected)
  })

  it('reports shared skills by canonical label', () => {
    const { sharedSkills } = scoreSnapshot({ ...baseSnapshot, skills: ['ML', 'py'] }, {
      ...baseSnapshot,
      skills: ['Machine Learning', 'Python', 'R'],
    })
    expect(sharedSkills).toEqual(['Machine Learning', 'Python'])
  })

  it('weights sum to 1', () => {
    expect(Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
})

describe('findMatches', () => {
  const query = { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' }

  it('only returns exact stream + country matches when 3 exist', () => {
    const pool = [
      alumnus('a'),
      alumnus('b'),
      alumnus('c'),
      alumnus('d'),
      alumnus('uk', { country: 'United Kingdom' }),
      alumnus('cs', { stream: 'MS in Computer Science' }),
    ]
    const { results, status, exactCount } = findMatches(baseSnapshot, query, pool)
    expect(results).toHaveLength(3)
    expect(status).toBe('complete')
    expect(exactCount).toBe(3)
    expect(results.every((r) => r.tier === 'exact' && !r.isFallback)).toBe(true)
  })

  it('sorts by score, then by id for ties', () => {
    const pool = [
      alumnus('z-tie'),
      alumnus('low', { preStudy: { ...baseSnapshot, industry: 'Automotive', city: 'Chennai' } }),
      alumnus('a-tie'),
      alumnus('m-tie'),
    ]
    const ids = findMatches(baseSnapshot, query, pool).results.map((r) => r.alumnus.id)
    expect(ids).toEqual(['a-tie', 'm-tie', 'z-tie'])
  })

  it('marks fallbacks and reports "limited" when fewer than 3 exact matches exist', () => {
    const pool = [
      alumnus('exact'),
      alumnus('other-country', { country: 'United Kingdom' }),
      alumnus('related-stream', { stream: 'MSc Business Analytics' }),
      alumnus('unrelated', { stream: 'MBA', country: 'United States' }),
    ]
    const { results, status, exactCount } = findMatches(baseSnapshot, query, pool)
    expect(status).toBe('limited')
    expect(exactCount).toBe(1)
    expect(results.map((r) => [r.alumnus.id, r.tier, r.isFallback])).toEqual([
      ['exact', 'exact', false],
      ['other-country', 'any-country', true],
      ['related-stream', 'related-stream', true],
    ])
  })

  it('keeps exact matches above higher-scoring fallbacks', () => {
    const pool = [
      alumnus('weak-exact', { preStudy: { ...baseSnapshot, skills: [], industry: 'Energy', city: 'Lima' } }),
      alumnus('strong-fallback', { country: 'United Kingdom' }),
    ]
    const ids = findMatches(baseSnapshot, query, pool).results.map((r) => r.alumnus.id)
    expect(ids).toEqual(['weak-exact', 'strong-fallback'])
  })

  it('returns fewer than 3 rather than inventing matches', () => {
    const { results, status } = findMatches(baseSnapshot, { ...query, stream: 'MS in Marine Biology' }, ALUMNI)
    expect(results).toHaveLength(0)
    expect(status).toBe('limited')
  })

  it('uses the city from the form, not the profile', () => {
    const pool = [alumnus('pune', { preStudy: { ...baseSnapshot, city: 'Pune' } })]
    const [result] = findMatches(baseSnapshot, { ...query, city: 'Pune' }, pool).results
    expect(result.breakdown.city).toBe(1)
  })

  it('scores only the pre-study snapshot', () => {
    const a = alumnus('a', { currentRole: 'Principal Engineer', gradYear: 2019 })
    const b = alumnus('b', { currentRole: 'Intern', gradYear: 2025 })
    const [ra, rb] = findMatches(baseSnapshot, query, [a, b]).results
    expect(ra.score).toBe(rb.score)
  })

  it('is deterministic', () => {
    const profile = DEMO_PROFILES[0]
    expect(findMatches(profile.profile, profile.suggestedSearch)).toEqual(
      findMatches(profile.profile, profile.suggestedSearch),
    )
  })
})

describe('synthetic dataset', () => {
  it('has unique ids and only known streams and countries', () => {
    expect(new Set(ALUMNI.map((a) => a.id)).size).toBe(ALUMNI.length)
    for (const a of ALUMNI) {
      expect(isKnownStream(canonicalStream(a.stream)), `${a.id} stream "${a.stream}"`).toBe(true)
      expect(isKnownCountry(canonicalCountry(a.country)), `${a.id} country "${a.country}"`).toBe(true)
    }
  })

  it('uses only reserved .example domains for emails and résumé sites', () => {
    for (const contact of ALUMNI.flatMap((a) => a.contacts)) {
      if (contact.kind === 'email' || contact.kind === 'resume') expect(contact.value).toMatch(/\.example$/)
    }
  })

  it('resolves demo LinkedIn URLs, ignoring case, trailing slash and query string', () => {
    expect(findDemoProfile('https://www.linkedin.com/in/Riya-Deshpande-Demo/?utm_source=x')?.name).toBe('Riya Deshpande')
    expect(findDemoProfile('https://www.linkedin.com/in/someone-else')).toBeUndefined()
    expect(findDemoProfile('not a url')).toBeUndefined()
  })

  it.each(DEMO_PROFILES.slice(0, 4).map((d) => [d.profile.name, d] as const))(
    'demo "%s" gets 3 exact matches',
    (_name, demo) => {
      const { results, status } = findMatches(demo.profile, demo.suggestedSearch)
      expect(status).toBe('complete')
      expect(results).toHaveLength(3)
    },
  )

  it('Bangalore → MS Data Science, Germany returns the expected top 3', () => {
    const demo = DEMO_PROFILES[0]
    const ids = findMatches(demo.profile, demo.suggestedSearch).results.map((r) => r.alumnus.id)
    expect(ids).toEqual(['ds-de-01', 'ds-de-06', 'ds-de-02'])
  })

  it('Pune → MS Mechanical Engineering, Germany is the limited-match demo', () => {
    const demo = DEMO_PROFILES[4]
    const { results, status, exactCount } = findMatches(demo.profile, demo.suggestedSearch)
    expect(status).toBe('limited')
    expect(exactCount).toBe(2)
    expect(results[2].isFallback).toBe(true)
  })
})
