import { RESULTS_PER_SEARCH } from '../config'
import { yearsPhrase } from '../lib/explain'
import { cityLabel, countryLabel, streamLabel } from '../lib/normalize'
import type { MatchQuery, MatchResponse, StudentProfile } from '../types'
import { AlumniCard } from './AlumniCard'
import { FocusHeading } from './FocusHeading'
import { HowCalculated } from './HowCalculated'

interface Props {
  /** Student profile with the form's city applied */
  student: StudentProfile
  query: MatchQuery
  linkedinUrl: string
  response: MatchResponse
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function ResultsSection({ student, query, linkedinUrl, response }: Props) {
  const { results, exactCount, status } = response
  const stream = streamLabel(query.stream)
  const country = countryLabel(query.country)
  const fallbackCount = results.length - exactCount

  if (results.length === 0) {
    return (
      <section aria-labelledby="results-heading" className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <FocusHeading id="results-heading" className="font-display text-2xl font-semibold">
          No alumni for {stream} in {country} yet
        </FocusHeading>
        <p className="mt-3 text-muted">
          Nobody in our network studied {stream} in {country}, or a closely related subject, so we’re not showing
          anyone rather than suggesting people who don’t fit.
        </p>
        <p className="mt-3 text-sm text-muted">
          This demo covers Data Science, Computer Science, MBA, Business Analytics and Mechanical Engineering in
          Germany, the UK, the US, Canada and Ireland.
        </p>
      </section>
    )
  }

  const heading =
    status === 'complete'
      ? `Your ${RESULTS_PER_SEARCH} alumni matches`
      : [exactCount > 0 && plural(exactCount, 'exact match', 'exact matches'), fallbackCount > 0 && plural(fallbackCount, 'fallback', 'fallbacks')]
          .filter(Boolean)
          .join(' + ')

  return (
    <section aria-labelledby="results-heading">
      <FocusHeading id="results-heading" className="font-display text-3xl font-semibold">
        {heading}
      </FocusHeading>
      <p className="mt-2 text-muted">
        {status === 'complete'
          ? `People who studied ${stream} in ${country} and started out most like you.`
          : `The closest people we have for ${stream} in ${country}, ranked by how similar their starting point was to yours.`}
      </p>
      <p className="mt-3 text-sm text-muted">
        <span className="font-medium text-ink">Matched against your profile:</span> {student.name} · {student.headline}{' '}
        · {yearsPhrase(student.yearsExp)} · {cityLabel(student.city)}
      </p>

      {status === 'limited' && (
        <div role="note" className="mt-5 rounded-xl border border-fallback/40 bg-fallback-soft px-5 py-4 text-sm text-fallback">
          <p className="font-semibold">
            {exactCount === 0
              ? `No one in our network studied ${stream} in ${country} yet.`
              : `Only ${plural(exactCount, 'alumnus', 'alumni')} in our network studied ${stream} in ${country}.`}
          </p>
          <p className="mt-1">
            {fallbackCount > 0
              ? `We’ve added ${plural(fallbackCount, 'close alternative', 'close alternatives')}, marked “Fallback match”. ${fallbackCount === 1 ? 'This person didn’t' : 'They didn’t'} study exactly this degree in this country, and each card says what they studied instead.`
              : 'We couldn’t find close alternatives, so we’re showing fewer than 3.'}
          </p>
        </div>
      )}

      <div className="mt-5">
        <HowCalculated stream={stream} country={country} />
      </div>

      <ol className="mt-6 space-y-5">
        {results.map((result, index) => (
          <li key={result.alumnus.id}>
            <AlumniCard
              rank={index + 1}
              result={result}
              student={student}
              query={query}
              linkedinUrl={linkedinUrl}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
