/** Profile signals compared for similarity. For alumni, this is the snapshot from before their degree started. */
export interface Snapshot {
  skills: string[]
  industry: string
  yearsExp: number
  city: string
  extracurriculars: string[]
}

export interface StudentProfile extends Snapshot {
  name: string
  headline: string
}

export type ContactKind = 'linkedin' | 'twitter' | 'resume' | 'email'

/** Where a contact detail came from. Only sources the alumnus made public themselves are allowed. */
export type ContactSource = 'self-published' | 'university-directory' | 'public-profile'

export interface Contact {
  kind: ContactKind
  value: string
  source: ContactSource
}

export interface Alumnus {
  id: string
  name: string
  stream: string
  country: string
  university: string
  gradYear: number
  currentRole: string
  preStudy: Snapshot
  contacts: Contact[]
}

export type SignalKey = 'skills' | 'industry' | 'experience' | 'city' | 'extracurriculars'

/**
 * exact = stream + country match.
 * any-country = same stream, different country (fallback).
 * related-stream = related stream, same country (fallback).
 * Fallbacks are used only when fewer than 3 exact matches exist.
 */
export type MatchTier = 'exact' | 'any-country' | 'related-stream'

export interface MatchResult {
  alumnus: Alumnus
  /** 0–100, rounded */
  score: number
  /** Each signal's similarity, 0–1, before weighting */
  breakdown: Record<SignalKey, number>
  tier: MatchTier
  isFallback: boolean
  /** Overlaps in display form, for explanations and the outreach email */
  sharedSkills: string[]
  sharedExtracurriculars: string[]
}

export interface MatchResponse {
  results: MatchResult[]
  /** How many results are exact stream + country matches */
  exactCount: number
  /** complete = 3 exact matches; limited = fewer than 3 exact, any rest are labelled fallbacks */
  status: 'complete' | 'limited'
}

export type MatchQuery = Pick<SearchInput, 'stream' | 'country' | 'city'>

export interface SearchInput {
  linkedinUrl: string
  stream: string
  country: string
  city: string
}

export interface DemoProfile {
  linkedinUrl: string
  profile: StudentProfile
  /** Search this demo profile is designed for */
  suggestedSearch: MatchQuery
}

export interface EmailDraft {
  subject: string
  body: string
  generatedBy: 'llm' | 'template'
}
