import { describe, expect, it } from 'vitest'
import { DEMO_PROFILES } from '../data/demoProfiles'
import type { StudentProfile } from '../types'
import { draftEmail } from './emailTemplate'
import { fallbackNote, listPhrase, matchReasons, matchStrength, signalPoints, SIGNALS, weightPercent } from './explain'
import { findMatches } from './match'

const riya = DEMO_PROFILES[0]
const aniket = DEMO_PROFILES[4]
const riyaResults = findMatches(riya.profile, riya.suggestedSearch).results
const aniketResults = findMatches(aniket.profile, aniket.suggestedSearch).results
const withCity = (p: StudentProfile, city: string) => ({ ...p, city })

describe('explanations', () => {
  it('weights shown in the UI are 35/20/20/15/10', () => {
    expect(SIGNALS.map((s) => [s.label, weightPercent(s.key)])).toEqual([
      ['Skills', 35],
      ['Industry', 20],
      ['Experience', 20],
      ['City', 15],
      ['Extracurriculars', 10],
    ])
  })

  it('signal points add up to the displayed score (within rounding)', () => {
    for (const result of [...riyaResults, ...aniketResults]) {
      const total = SIGNALS.reduce((sum, s) => sum + signalPoints(result, s.key), 0)
      expect(Math.abs(total - result.score)).toBeLessThanOrEqual(2)
    }
  })

  it('gives up to 3 reasons, strongest first, in plain language', () => {
    const reasons = matchReasons(riyaResults[0], withCity(riya.profile, 'Bangalore'))
    expect(reasons).toEqual([
      'used Python, SQL, Machine Learning and 2 more of your skills',
      'worked in Fintech, like you',
      'had 3 years of experience, same as you',
    ])
  })

  it('describes partial credit honestly', () => {
    const sneha = riyaResults.find((r) => r.alumnus.id === 'ds-de-02')!
    const reasons = matchReasons(sneha, withCity(riya.profile, 'Bangalore'), 5)
    expect(reasons).toContain('worked in Banking & Financial Services, close to your Fintech background')
    expect(reasons).toContain('had 2 years of experience (you have 3)')
  })

  it('labels scores in words', () => {
    expect(matchStrength(92)).toBe('Very similar start')
    expect(matchStrength(60)).toBe('Strong match')
    expect(matchStrength(45)).toBe('Some overlap')
    expect(matchStrength(10)).toBe('Loose match')
  })

  it('listPhrase', () => {
    expect(listPhrase(['A'])).toBe('A')
    expect(listPhrase(['A', 'B'])).toBe('A and B')
    expect(listPhrase(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('fallback note says what the person actually studied', () => {
    const fallback = aniketResults.find((r) => r.isFallback)!
    expect(fallbackNote(fallback, aniket.suggestedSearch)).toBe(
      'Studied Mechanical Engineering in United States, not Germany.',
    )
    expect(fallbackNote(aniketResults[0], aniket.suggestedSearch)).toBeNull()
  })
})

describe('draftEmail (deterministic template)', () => {
  const context = {
    student: withCity(riya.profile, 'Bangalore'),
    result: riyaResults[0],
    query: riya.suggestedSearch,
    linkedinUrl: riya.linkedinUrl,
  }

  it('is personalised with the alumnus, their university and shared background', () => {
    const { subject, body, generatedBy } = draftEmail(context)
    expect(generatedBy).toBe('template')
    expect(subject).toBe('Aspiring Data Science student from Bangalore: 30 minutes of your advice?')
    expect(body).toMatch(/^Hi Karthik,/)
    expect(body).toContain("I'm planning to apply for a master's in Data Science in Germany")
    expect(body).toContain('Before University of Mannheim, you were working in Fintech in Bangalore with 3 years of experience')
    expect(body).toContain('We also have Python, SQL and Machine Learning in common')
    expect(body).toContain('paid 30-minute mentorship call')
    expect(body).toContain(riya.linkedinUrl)
  })

  it('is deterministic', () => {
    expect(draftEmail(context)).toEqual(draftEmail(context))
  })

  it('never claims a fallback studied the requested stream or country', () => {
    const fallback = aniketResults.find((r) => r.isFallback)!
    const { body } = draftEmail({
      student: withCity(aniket.profile, 'Pune'),
      result: fallback,
      query: aniket.suggestedSearch,
      linkedinUrl: aniket.linkedinUrl,
    })
    expect(body).toContain('in United States rather than Germany')
    expect(body).not.toContain('before moving to Germany')
    expect(body).not.toMatch(/^Before Purdue/m)
  })

  it('uses "an MBA" for MBA searches', () => {
    const nisha = DEMO_PROFILES[2]
    const [result] = findMatches(nisha.profile, nisha.suggestedSearch).results
    const { body } = draftEmail({ student: nisha.profile, result, query: nisha.suggestedSearch, linkedinUrl: nisha.linkedinUrl })
    expect(body).toContain("I'm planning to apply for an MBA in United Kingdom")
  })
})
