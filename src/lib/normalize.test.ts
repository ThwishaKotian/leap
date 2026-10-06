import { describe, expect, it } from 'vitest'
import {
  canonicalCity,
  canonicalCountry,
  canonicalExtracurricular,
  canonicalIndustry,
  canonicalSkill,
  canonicalStream,
  normalizeKey,
} from './normalize'

describe('normalizeKey', () => {
  it('lowercases, strips punctuation and accents, keeps + and #', () => {
    expect(normalizeKey('  M.Sc.  Data-Science ')).toBe('m sc data science')
    expect(normalizeKey('Saïd')).toBe('said')
    expect(normalizeKey('C++')).toBe('c++')
  })
})

describe('canonicalStream', () => {
  it.each([
    'MS in Data Science',
    'M.Sc. Data Science',
    'MSc Data Science',
    "Master's in Data Science",
    'Master of Science in Data Science',
    'data science',
    'MS DS',
  ])('maps "%s" to data-science', (raw) => {
    expect(canonicalStream(raw)).toBe('data-science')
  })

  it('handles MBA and non-standard degree names', () => {
    expect(canonicalStream('MBA')).toBe('mba')
    expect(canonicalStream('M.Sc. Informatics (Computer Science)')).toBe('computer-science')
    expect(canonicalStream('MMath in Computer Science')).toBe('computer-science')
  })

  it('returns normalised text for unknown streams instead of guessing', () => {
    expect(canonicalStream('MS in Marine Biology')).toBe('marine biology')
  })
})

describe('canonicalCountry / canonicalCity', () => {
  it('resolves country aliases', () => {
    expect(canonicalCountry('Deutschland')).toBe('germany')
    expect(canonicalCountry('USA')).toBe('united-states')
    expect(canonicalCountry('U.K.')).toBe('united-kingdom')
  })

  it('resolves city aliases', () => {
    expect(canonicalCity('Bengaluru')).toBe('bangalore')
    expect(canonicalCity('gurugram')).toBe('gurgaon')
  })
})

describe('skills, industries, extracurriculars', () => {
  it('maps aliases to one display label', () => {
    expect(canonicalSkill('reactjs')).toBe('React')
    expect(canonicalSkill('ML')).toBe('Machine Learning')
    expect(canonicalSkill('SolidWorks')).toBe('CAD')
    expect(canonicalIndustry('Investment Banking')).toBe('banking')
    expect(canonicalExtracurricular('SAE BAJA')).toBe('Formula Student')
  })

  it('keeps unknown skills as written', () => {
    expect(canonicalSkill('Figma')).toBe('Figma')
  })
})
