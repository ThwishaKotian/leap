import type { EmailDraft, MatchQuery, MatchResult, Snapshot, StudentProfile } from '../types'
import { firstName, listPhrase, yearsPhrase } from './explain'
import { canonicalStream, cityLabel, countryLabel, industryLabel, streamLabel } from './normalize'

export interface EmailContext {
  /** Student profile, with the city from the form already applied */
  student: StudentProfile
  result: MatchResult
  query: MatchQuery
  linkedinUrl: string
}

function withArticle(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? `an ${phrase}` : `a ${phrase}`
}

/** "an MBA" / "a master's in Data Science" */
function degreePhrase(stream: string): string {
  return canonicalStream(stream) === 'mba' ? 'an MBA' : `a master's in ${streamLabel(stream)}`
}

/** "working in Fintech in Bangalore with 3 years of experience" */
function background(pre: Snapshot): string {
  const city = cityLabel(pre.city)
  if (pre.yearsExp === 0) return `a recent graduate in ${city}`
  return `working in ${industryLabel(pre.industry)} in ${city} with ${yearsPhrase(pre.yearsExp)}`
}

/** The sentence that connects the alumnus's path to the student's. Fallbacks say plainly what they studied instead. */
function pathSentence({ result, query }: EmailContext): string {
  const { alumnus } = result
  const before = background(alumnus.preStudy)
  if (result.tier === 'any-country') {
    return `You did ${streamLabel(alumnus.stream)} at ${alumnus.university} in ${countryLabel(alumnus.country)} rather than ${countryLabel(query.country)}, but before that you were ${before}, which is very close to where I am today.`
  }
  if (result.tier === 'related-stream') {
    return `Your degree at ${alumnus.university} was in ${streamLabel(alumnus.stream)} rather than ${streamLabel(query.stream)}, but before that you were ${before}, which is very close to where I am today.`
  }
  return `Before ${alumnus.university}, you were ${before}, which is very close to where I am today.`
}

function sharedSentence({ result }: EmailContext): string | null {
  const skills = result.sharedSkills.slice(0, 3)
  const extras = result.sharedExtracurriculars.slice(0, 2)
  if (skills.length && extras.length) {
    return `We also have ${listPhrase(skills)} in common, and I noticed you were into ${listPhrase(extras)} as well.`
  }
  if (skills.length) return `We also have ${listPhrase(skills)} in common.`
  if (extras.length) return `I also noticed we both did ${listPhrase(extras)}.`
  return null
}

function askSentence({ result, query }: EmailContext): string {
  const { alumnus } = result
  const topics =
    result.tier === 'exact'
      ? `how you chose ${alumnus.university}, what made your application stand out, and what you wish you'd known before moving to ${countryLabel(query.country)}`
      : `how you approached your application and what you wish you'd known before moving abroad`
  return `Now that you're working as ${withArticle(alumnus.currentRole)}, I'd really value your perspective on ${topics}.`
}

/** Deterministic outreach email. Always available; an LLM can improve on it later but is never required. */
export function draftEmail(context: EmailContext): EmailDraft {
  const { student, result, query, linkedinUrl } = context
  const paragraphs = [
    `Hi ${firstName(result.alumnus.name)},`,
    `I'm ${student.name}, currently ${withArticle(student.headline)}. I'm planning to apply for ${degreePhrase(query.stream)} in ${countryLabel(query.country)}, and your path stood out to me. ${pathSentence(context)}`,
    [sharedSentence(context), askSentence(context)].filter(Boolean).join(' '),
    `Would you be open to a paid 30-minute mentorship call in the next couple of weeks? I'm happy to work around your schedule, and I'll come with specific questions so it's a good use of your time.`,
    `Thank you,\n${student.name}\n${linkedinUrl}`,
  ]
  return {
    subject: `Aspiring ${streamLabel(query.stream)} student from ${cityLabel(student.city)}: 30 minutes of your advice?`,
    body: paragraphs.join('\n\n'),
    generatedBy: 'template',
  }
}
