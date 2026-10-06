/**
 * Render smoke tests: static HTML via react-dom/server, so no browser test runner is needed.
 * They check what each state tells the user, not styling.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { DEMO_PROFILES } from '../data/demoProfiles'
import { findMatches } from '../lib/match'
import type { MatchQuery } from '../types'
import { ConnectPanel } from './ConnectPanel'
import { ResultsSection } from './ResultsSection'

function renderResults(demoIndex: number, query?: MatchQuery) {
  const demo = DEMO_PROFILES[demoIndex]
  const q = query ?? demo.suggestedSearch
  return renderToStaticMarkup(
    <ResultsSection
      student={{ ...demo.profile, city: q.city }}
      query={q}
      linkedinUrl={demo.linkedinUrl}
      response={findMatches(demo.profile, q)}
    />,
  )
}

// Fail on any React error or warning (invalid nesting, missing keys, etc.)
let consoleProblems: unknown[][]
beforeEach(() => {
  consoleProblems = []
  vi.spyOn(console, 'error').mockImplementation((...args) => void consoleProblems.push(args))
  vi.spyOn(console, 'warn').mockImplementation((...args) => void consoleProblems.push(args))
})
afterEach(() => {
  vi.restoreAllMocks()
  expect(consoleProblems, 'React logged errors or warnings').toEqual([])
})

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('App (initial render)', () => {
  const html = renderToStaticMarkup(<App />)

  it('has exactly the four inputs, pre-filled with the Riya demo', () => {
    const inputs = html.match(/<input[^>]*>/g) ?? []
    expect(inputs).toHaveLength(4)
    expect(html).toContain('value="https://www.linkedin.com/in/riya-deshpande-demo"')
    expect(html).toContain('value="MS in Data Science"')
    expect(html).toContain('value="Germany"')
    expect(html).toContain('value="Bangalore"')
  })

  it('every input has a label', () => {
    for (const id of ['field-linkedinUrl', 'field-stream', 'field-country', 'field-city']) {
      expect(html).toContain(`for="${id}"`)
      expect(html).toContain(`id="${id}"`)
    }
  })

  it('has the primary CTA', () => {
    expect(html).toContain('Find my 3 alumni matches')
  })
})

describe('ResultsSection', () => {
  it('complete match: 3 cards with name, degree, university, role, score, reasons and Connect', () => {
    const html = renderResults(0)
    const t = text(html)
    expect(html.match(/<article/g)).toHaveLength(3)
    expect(t).toContain('Your 3 alumni matches')
    for (const name of ['Karthik Iyer', 'Divya Krishnan', 'Sneha Kulkarni']) expect(t).toContain(name)
    expect(t).toContain('M.Sc. Data Science · University of Mannheim, Germany')
    expect(t).toContain('Now: Data Scientist at a Munich insurtech')
    expect(html).toContain('aria-label="92 out of 100 profile similarity')
    expect(t).toContain('Why this match?')
    expect(t).toContain('Connect with Karthik')
    expect(t).toContain('How is this calculated?')
    expect(t).not.toContain('Fallback match.')
  })

  it('limited match: says so, labels the fallback, and states what they studied', () => {
    const t = text(renderResults(4))
    expect(t).toContain('Only 2 alumni in our network studied Mechanical Engineering in Germany.')
    expect(t).toContain('Fallback match. Studied Mechanical Engineering in United States, not Germany.')
    expect(t.match(/Fallback match\./g)).toHaveLength(1)
    expect(t).toContain('2 exact matches + 1 fallback')
    expect(t).not.toContain('Your 3 alumni matches')
    expect(t).not.toContain('People who studied Mechanical Engineering in Germany')
  })

  it('no matches: empty state, no cards', () => {
    const html = renderResults(0, { stream: 'MS in Marine Biology', country: 'Germany', city: 'Bangalore' })
    expect(html).not.toContain('<article')
    expect(text(html)).toContain('No alumni for MS in Marine Biology in Germany yet')
  })
})

describe('ConnectPanel', () => {
  const demo = DEMO_PROFILES[0]
  const results = findMatches(demo.profile, demo.suggestedSearch).results

  function renderPanel(index: number) {
    return renderToStaticMarkup(
      <ConnectPanel
        id="p"
        student={demo.profile}
        result={results[index]}
        query={demo.suggestedSearch}
        linkedinUrl={demo.linkedinUrl}
      />,
    )
  }

  it('shows the sourced email, links, the draft and a copy button', () => {
    const html = renderPanel(0) // Karthik: self-published email
    const t = text(html)
    expect(t).toContain('hello@karthik-iyer.example')
    expect(t).toContain('Source: Published on their own site')
    expect(t).toContain('LinkedIn')
    expect(html).toContain('Hi Karthik,')
    expect(t).toContain('Copy email')
    expect(t).toContain('Open in email app')
  })

  it('says plainly when no email is published', () => {
    const t = text(renderPanel(1)) // Divya: no email
    expect(t).toContain('hasn’t published an email address')
    expect(t).not.toContain('Open in email app')
  })
})
