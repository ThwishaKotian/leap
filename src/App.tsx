import { useState } from 'react'
import { DAILY_ALUMNI_LIMIT } from './config'
import { ResultsSection } from './components/ResultsSection'
import { FocusHeading } from './components/FocusHeading'
import { SearchForm } from './components/SearchForm'
import { ALUMNI_DATA_NOTICE } from './data/alumni'
import { DEMO_PROFILES, findDemoProfile } from './data/demoProfiles'
import {
  browserStorage,
  checkAllowance,
  readUsage,
  recordShown,
  remaining,
  resetUsage,
  type DailyUsage,
} from './lib/dailyLimit'
import { findMatches } from './lib/match'
import type { MatchQuery, MatchResponse, SearchInput, StudentProfile } from './types'

/** Stands in for the profile-enrichment API call a production version would make. */
const PROFILE_LOOKUP_DELAY_MS = 450

type SearchOutcome =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'not-found'; url: string }
  | { kind: 'error' }
  | { kind: 'limit-reached'; newCount: number; remaining: number }
  | { kind: 'results'; student: StudentProfile; query: MatchQuery; linkedinUrl: string; response: MatchResponse }

const DEFAULT_DEMO = DEMO_PROFILES[0]

function App() {
  const [values, setValues] = useState<SearchInput>({
    linkedinUrl: DEFAULT_DEMO.linkedinUrl,
    ...DEFAULT_DEMO.suggestedSearch,
  })
  const [outcome, setOutcome] = useState<SearchOutcome>({ kind: 'idle' })
  // Remounts the outcome on every search so its heading takes focus again.
  const [searchId, setSearchId] = useState(0)
  const [storage] = useState(browserStorage)
  const [usage, setUsage] = useState<DailyUsage>(() => readUsage(storage))

  async function search(input: SearchInput) {
    setOutcome({ kind: 'loading' })
    await new Promise((resolve) => setTimeout(resolve, PROFILE_LOOKUP_DELAY_MS))
    try {
      const profile = findDemoProfile(input.linkedinUrl)
      if (!profile) {
        setOutcome({ kind: 'not-found', url: input.linkedinUrl.trim() })
      } else {
        const query: MatchQuery = { stream: input.stream.trim(), country: input.country.trim(), city: input.city.trim() }
        const response = findMatches(profile, query)
        const shownIds = response.results.map((r) => r.alumnus.id)
        // Re-read so a new day (or another tab) is picked up.
        const current = readUsage(storage)
        const allowance = checkAllowance(current, shownIds)
        if (!allowance.allowed) {
          setUsage(current)
          setOutcome({ kind: 'limit-reached', newCount: allowance.newIds.length, remaining: allowance.remaining })
        } else {
          setUsage(recordShown(current, shownIds, storage))
          setOutcome({
            kind: 'results',
            student: { ...profile, city: query.city || profile.city },
            query,
            linkedinUrl: input.linkedinUrl.trim(),
            response,
          })
        }
      }
    } catch (error) {
      console.error(error)
      setOutcome({ kind: 'error' })
    }
    setSearchId((id) => id + 1)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Alumni Match</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Talk to someone who started where you are.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Tell us where you want to study. We’ll find 3 alumni who took that path and whose profile before their
            degree looked most like yours today, then help you reach out.
          </p>
        </header>

        <main className="mt-8">
          <SearchForm
            values={values}
            onChange={setValues}
            onSubmit={search}
            busy={outcome.kind === 'loading'}
            remainingToday={remaining(usage)}
          />

          <div className="mt-10" key={searchId}>
            <Outcome
              outcome={outcome}
              onPickDemo={(demo) => setValues(demo)}
              onResetAllowance={() => {
                setUsage(resetUsage(storage))
                setOutcome({ kind: 'idle' })
                document.getElementById('field-linkedinUrl')?.focus()
              }}
            />
          </div>
        </main>

        <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
          <p>Prototype. {ALUMNI_DATA_NOTICE} Contact links point to placeholder addresses.</p>
          <AboutPrototype />
        </footer>
      </div>
    </div>
  )
}

interface OutcomeProps {
  outcome: SearchOutcome
  onPickDemo: (values: SearchInput) => void
  onResetAllowance: () => void
}

function Outcome({ outcome, onPickDemo, onResetAllowance }: OutcomeProps) {
  switch (outcome.kind) {
    case 'idle':
      return null
    case 'loading':
      return (
        <div role="status" className="rounded-2xl border border-line bg-white p-6 text-muted">
          Reading your profile and comparing it with alumni…
        </div>
      )
    case 'not-found':
      return (
        <section aria-labelledby="outcome-heading" className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <FocusHeading id="outcome-heading" className="font-display text-2xl font-semibold">
            We couldn’t read that profile
          </FocusHeading>
          <p className="mt-3 text-muted">
            This prototype can’t fetch live LinkedIn profiles (that needs scraping or a paid data provider), so it only
            knows a few sample students. <span className="break-all">{outcome.url}</span> isn’t one of them.
          </p>
          <p className="mt-4 text-sm font-medium text-ink">Try a sample student instead:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {DEMO_PROFILES.map((demo) => (
              <li key={demo.linkedinUrl}>
                <button
                  type="button"
                  onClick={() => {
                    onPickDemo({ linkedinUrl: demo.linkedinUrl, ...demo.suggestedSearch })
                    document.getElementById('field-linkedinUrl')?.focus()
                  }}
                  className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {demo.profile.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )
    case 'error':
      return (
        <section aria-labelledby="outcome-heading" className="rounded-2xl border border-danger/40 bg-white p-6 sm:p-8">
          <FocusHeading id="outcome-heading" className="font-display text-2xl font-semibold">
            Something went wrong
          </FocusHeading>
          <p className="mt-3 text-muted">We couldn’t finish the search. Please try again.</p>
        </section>
      )
    case 'limit-reached':
      return (
        <section aria-labelledby="outcome-heading" className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <FocusHeading id="outcome-heading" className="font-display text-2xl font-semibold">
            {outcome.remaining === 0
              ? `You’ve seen today’s ${DAILY_ALUMNI_LIMIT} alumni`
              : `This search needs ${outcome.newCount} new alumni, and you have ${outcome.remaining} left today`}
          </FocusHeading>
          <p className="mt-3 text-muted">
            You can see up to {DAILY_ALUMNI_LIMIT} different alumni per day, so you can give each conversation proper
            attention and alumni aren’t flooded with requests. Your allowance resets at midnight.
          </p>
          <p className="mt-3 text-muted">Searches that show alumni you’ve already seen today are always free.</p>
          <div className="mt-5 rounded-xl border border-line bg-paper px-4 py-3.5 text-sm text-muted">
            <p>
              <span className="font-medium text-ink">Trying the demo?</span> This limit is stored only in this browser,
              so you can reset it.
            </p>
            <button
              type="button"
              onClick={onResetAllowance}
              className="mt-2.5 rounded-lg border border-accent px-3.5 py-2 text-sm font-semibold text-accent-strong hover:bg-accent-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Reset demo allowance
            </button>
          </div>
        </section>
      )
    case 'results':
      return (
        <ResultsSection
          student={outcome.student}
          query={outcome.query}
          linkedinUrl={outcome.linkedinUrl}
          response={outcome.response}
        />
      )
  }
}

function AboutPrototype() {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        About this prototype
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>
          LinkedIn profiles can’t be read without scraping or a paid data provider, so 5 sample students and 45
          synthetic alumni stand in for real data.
        </li>
        <li>
          Contact details are only ever ones an alumnus published themselves, each shown with its source. Nothing is
          guessed or scraped.
        </li>
        <li>Outreach emails come from a fixed template, so they work without any AI service.</li>
        <li>
          The {DAILY_ALUMNI_LIMIT}-alumni daily limit is stored in this browser only. It’s a demo of the rule, not
          abuse protection.
        </li>
      </ul>
    </details>
  )
}

export default App
