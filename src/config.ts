import type { SignalKey } from './types'

/** Fixed by the brief: exactly 3 alumni per search, and a static daily limit of 3 alumni. */
export const RESULTS_PER_SEARCH = 3
export const DAILY_ALUMNI_LIMIT = 3

/** Similarity weights (sum to 1). See README for the reasoning. */
export const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  skills: 0.35,
  industry: 0.2,
  experience: 0.2,
  city: 0.15,
  extracurriculars: 0.1,
}

/** A gap of this many years or more scores 0 on experience similarity. */
export const MAX_EXPERIENCE_GAP = 5

/** Score at or above which a match counts as strong. */
export const STRONG_MATCH_THRESHOLD = 60
