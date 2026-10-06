import { useState } from 'react'
import { fallbackNote, firstName, matchReasons, SIGNALS, signalPoints, weightPercent } from '../lib/explain'
import { countryLabel } from '../lib/normalize'
import type { MatchQuery, MatchResult, StudentProfile } from '../types'
import { ConnectPanel } from './ConnectPanel'
import { ScoreBadge } from './ScoreBadge'

interface Props {
  rank: number
  result: MatchResult
  /** Student profile with the form's city applied */
  student: StudentProfile
  query: MatchQuery
  linkedinUrl: string
}

export function AlumniCard({ rank, result, student, query, linkedinUrl }: Props) {
  const { alumnus } = result
  const name = firstName(alumnus.name)
  const reasons = matchReasons(result, student)
  const note = fallbackNote(result, query)
  const panelId = `connect-${alumnus.id}`
  const [connectOpen, setConnectOpen] = useState(false)
  // Keep the panel mounted after first open so edits to the draft survive closing it.
  const [opened, setOpened] = useState(false)

  return (
    <article
      aria-labelledby={`${alumnus.id}-name`}
      className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${result.isFallback ? 'border-fallback/40' : 'border-line'}`}
    >
      {result.isFallback && (
        <div className="-mx-5 -mt-5 mb-5 rounded-t-2xl border-b border-fallback/30 bg-fallback-soft px-5 py-2.5 text-sm text-fallback sm:-mx-6 sm:-mt-6 sm:px-6">
          <span className="font-semibold">Fallback match.</span> {note}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Match {rank}</p>
          <h3 id={`${alumnus.id}-name`} className="mt-1 font-display text-2xl font-semibold text-ink">
            {alumnus.name}
          </h3>
          <p className="mt-1 text-sm text-ink">
            {alumnus.stream} · {alumnus.university}, {countryLabel(alumnus.country)} · {alumnus.gradYear}
          </p>
          <p className="mt-0.5 text-sm text-muted">Now: {alumnus.currentRole}</p>
        </div>
        <ScoreBadge score={result.score} muted={result.isFallback} />
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-ink">Why this match?</h4>
        {reasons.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-muted">Before starting their degree, {name}:</p>
            <ul className="mt-2 space-y-1.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2.5 text-sm text-ink">
                  <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {name}’s early career looks quite different from yours. They’re shown because few alumni match this
            search.
          </p>
        )}
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-sm text-muted underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          See score breakdown
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
          {SIGNALS.map((signal) => {
            const points = signalPoints(result, signal.key)
            const max = weightPercent(signal.key)
            return (
              <div key={signal.key} className="contents">
                <dt className="text-muted">{signal.label}</dt>
                <dd aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(points / max) * 100}%` }} />
                </dd>
                <dd className="text-right tabular-nums text-ink">
                  {points}
                  <span className="text-muted"> / {max}</span>
                </dd>
              </div>
            )
          })}
        </dl>
      </details>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            setConnectOpen(!connectOpen)
            setOpened(true)
          }}
          aria-expanded={connectOpen}
          aria-controls={panelId}
          className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto ${
            connectOpen
              ? 'border border-line bg-white text-ink hover:bg-paper'
              : 'bg-accent text-white hover:bg-accent-strong'
          }`}
        >
          {connectOpen ? 'Hide contact details' : `Connect with ${name}`}
        </button>
        {opened && (
          <div hidden={!connectOpen}>
            <ConnectPanel id={panelId} student={student} result={result} query={query} linkedinUrl={linkedinUrl} />
          </div>
        )}
      </div>
    </article>
  )
}
