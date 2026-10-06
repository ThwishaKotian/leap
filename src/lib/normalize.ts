import {
  CITIES,
  COUNTRIES,
  DEGREE_PREFIXES,
  EXTRACURRICULAR_ALIASES,
  INDUSTRIES,
  SKILL_ALIASES,
  STREAMS,
} from '../data/synonyms'

/** Lowercase, strip accents and punctuation (keeping + and #), collapse whitespace. */
export function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim()
}

/** Map every alias (and the canonical key itself) to its canonical key. */
function buildLookup(table: Record<string, { aliases: string[] }>): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const [canonical, { aliases }] of Object.entries(table)) {
    lookup.set(normalizeKey(canonical), canonical)
    for (const alias of aliases) lookup.set(normalizeKey(alias), canonical)
  }
  return lookup
}

function buildLabelLookup(table: Record<string, string[]>): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const [label, aliases] of Object.entries(table)) {
    lookup.set(normalizeKey(label), label)
    for (const alias of aliases) lookup.set(normalizeKey(alias), label)
  }
  return lookup
}

const STREAM_LOOKUP = buildLookup(STREAMS)
const COUNTRY_LOOKUP = buildLookup(COUNTRIES)
const CITY_LOOKUP = buildLookup(CITIES)
const INDUSTRY_LOOKUP = buildLookup(INDUSTRIES)
const SKILL_LOOKUP = buildLabelLookup(SKILL_ALIASES)
const EXTRACURRICULAR_LOOKUP = buildLabelLookup(EXTRACURRICULAR_ALIASES)

function stripDegreePrefix(key: string): string {
  for (const prefix of DEGREE_PREFIXES) {
    if (key.startsWith(prefix + ' ')) return key.slice(prefix.length + 1)
  }
  return key
}

/** Canonical stream id, e.g. "M.Sc. Data Science" → "data-science". Unknown streams return their normalised text. */
export function canonicalStream(raw: string): string {
  const key = normalizeKey(raw)
  return STREAM_LOOKUP.get(key) ?? STREAM_LOOKUP.get(stripDegreePrefix(key)) ?? stripDegreePrefix(key)
}

export function isKnownStream(id: string): boolean {
  return id in STREAMS
}

export function relatedStreams(streamId: string): string[] {
  return STREAMS[streamId]?.related ?? []
}

export function canonicalCountry(raw: string): string {
  const key = normalizeKey(raw)
  return COUNTRY_LOOKUP.get(key) ?? key
}

export function isKnownCountry(id: string): boolean {
  return id in COUNTRIES
}

export function canonicalCity(raw: string): string {
  const key = normalizeKey(raw)
  return CITY_LOOKUP.get(key) ?? key
}

export function countryOfCity(cityId: string): string | undefined {
  return CITIES[cityId]?.country
}

export function canonicalIndustry(raw: string): string {
  const key = normalizeKey(raw)
  return INDUSTRY_LOOKUP.get(key) ?? key
}

/** Different industries that share a group, e.g. Fintech and Banking (both "finance"). */
export function industriesRelated(a: string, b: string): boolean {
  const groupsA = INDUSTRIES[a]?.groups ?? []
  const groupsB = INDUSTRIES[b]?.groups ?? []
  return groupsA.some((g) => groupsB.includes(g))
}

/** Canonical display label for a skill, e.g. "reactjs" → "React". Unknown skills keep their original text. */
export function canonicalSkill(raw: string): string {
  return SKILL_LOOKUP.get(normalizeKey(raw)) ?? raw.trim()
}

export function canonicalExtracurricular(raw: string): string {
  return EXTRACURRICULAR_LOOKUP.get(normalizeKey(raw)) ?? raw.trim()
}

// ── Display labels (UI only; not used for matching) ─────────────────────────

/** "M.Sc. Data Science" → "Data Science". Unknown streams are returned as typed. */
export function streamLabel(raw: string): string {
  return STREAMS[canonicalStream(raw)]?.label ?? raw.trim()
}

export function countryLabel(raw: string): string {
  return COUNTRIES[canonicalCountry(raw)]?.label ?? raw.trim()
}

export function cityLabel(raw: string): string {
  return CITIES[canonicalCity(raw)]?.label ?? raw.trim()
}

export function industryLabel(raw: string): string {
  return INDUSTRIES[canonicalIndustry(raw)]?.label ?? raw.trim()
}

/** Canonicalise a list and key it for set comparison. Map key = normalised label, value = display label. */
export function canonicalSet(items: string[], canonicalize: (raw: string) => string): Map<string, string> {
  const set = new Map<string, string>()
  for (const item of items) {
    const label = canonicalize(item)
    const key = normalizeKey(label)
    if (key && !set.has(key)) set.set(key, label)
  }
  return set
}
