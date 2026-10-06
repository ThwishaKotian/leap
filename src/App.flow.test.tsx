// @vitest-environment jsdom
/**
 * End-to-end UI flows in jsdom: what a student or evaluator actually clicks through.
 * Every test fails if React logs an error or warning.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY, todayKey } from './lib/dailyLimit'

let consoleProblems: unknown[][]
beforeEach(() => {
  window.localStorage.clear()
  consoleProblems = []
  vi.spyOn(console, 'error').mockImplementation((...args) => void consoleProblems.push(args))
  vi.spyOn(console, 'warn').mockImplementation((...args) => void consoleProblems.push(args))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  expect(consoleProblems, 'React logged errors or warnings').toEqual([])
})

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement
const submit = () => screen.getByRole('button', { name: /find my 3 alumni matches/i })
const cards = () => screen.queryAllByRole('article')
const cardFor = (name: string) => screen.getByRole('article', { name })

async function setup() {
  const user = userEvent.setup()
  const utils = render(<App />)
  return { user, ...utils }
}

async function searchRiya(user: ReturnType<typeof userEvent.setup>) {
  await user.click(submit())
  return screen.findByRole('heading', { name: 'Your 3 alumni matches' })
}

describe('search form', () => {
  it('has exactly 4 required, labelled inputs, pre-filled with the Riya demo', async () => {
    const { container } = await setup()
    const inputs = container.querySelectorAll('form input')
    expect(inputs).toHaveLength(4)
    inputs.forEach((input) => expect(input).toHaveProperty('required', true))
    expect(field(/linkedin profile url/i).value).toBe('https://www.linkedin.com/in/riya-deshpande-demo')
    expect(field(/degree you want to study/i).value).toBe('MS in Data Science')
    expect(field(/target country/i).value).toBe('Germany')
    expect(field(/current city/i).value).toBe('Bangalore')
  })

  it('demo profile buttons populate all four fields', async () => {
    const { user } = await setup()
    const tejas = screen.getByRole('button', { name: /tejas rao/i })
    await user.click(tejas)
    expect(field(/linkedin profile url/i).value).toBe('https://www.linkedin.com/in/tejas-rao-demo')
    expect(field(/degree you want to study/i).value).toBe('MS in Computer Science')
    expect(field(/target country/i).value).toBe('United States')
    expect(field(/current city/i).value).toBe('Hyderabad')
    expect(tejas.getAttribute('aria-pressed')).toBe('true')
  })

  it('invalid LinkedIn URL: shows an error, focuses the field, and does not search', async () => {
    const { user } = await setup()
    const url = field(/linkedin profile url/i)
    await user.clear(url)
    await user.type(url, 'not a url')
    await user.click(submit())
    expect(screen.getByText(/doesn’t look like a LinkedIn profile URL/)).toBeTruthy()
    expect(url.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(url)
    expect(screen.queryByRole('status')).toBeNull()
    expect(cards()).toHaveLength(0)
  })

  it('empty fields each get their own error', async () => {
    const { user } = await setup()
    for (const label of [/linkedin profile url/i, /degree/i, /target country/i, /current city/i]) {
      await user.clear(field(label))
    }
    await user.click(submit())
    expect(screen.getByText('Paste your LinkedIn profile URL.')).toBeTruthy()
    expect(screen.getByText('Enter the degree you plan to study.')).toBeTruthy()
    expect(screen.getByText('Enter the country you want to study in.')).toBeTruthy()
    expect(screen.getByText('Enter the city you live in now.')).toBeTruthy()
  })

  it('unknown LinkedIn profile: explains why, and the sample buttons fill the form', async () => {
    const { user } = await setup()
    const url = field(/linkedin profile url/i)
    await user.clear(url)
    await user.type(url, 'https://www.linkedin.com/in/someone-else')
    await user.click(submit())
    expect(await screen.findByRole('heading', { name: 'We couldn’t read that profile' })).toBeTruthy()
    const outcome = screen.getByRole('region', { name: 'We couldn’t read that profile' })
    await user.click(within(outcome).getByRole('button', { name: 'Megha Arora' }))
    expect(field(/linkedin profile url/i).value).toBe('https://www.linkedin.com/in/megha-arora-demo')
    expect(field(/target country/i).value).toBe('Ireland')
  })
})

describe('Riya demo flow', () => {
  it('shows a loading state, then exactly 3 results with scores and reasons, and focuses the heading', async () => {
    const { user } = await setup()
    await user.click(submit())
    expect(screen.getByRole('status').textContent).toMatch(/comparing it with alumni/)
    expect(screen.getByRole('button', { name: /finding your matches/i }).hasAttribute('disabled')).toBe(true)

    const heading = await screen.findByRole('heading', { name: 'Your 3 alumni matches' })
    expect(document.activeElement).toBe(heading)
    expect(cards()).toHaveLength(3)

    const expected = [
      ['Karthik Iyer', 92],
      ['Divya Krishnan', 78],
      ['Sneha Kulkarni', 74],
    ] as const
    for (const [name, score] of expected) {
      const card = cardFor(name)
      expect(within(card).getByRole('img', { name: new RegExp(`^${score} out of 100 profile similarity`) })).toBeTruthy()
      expect(within(card).getByText('Why this match?')).toBeTruthy()
      expect(within(card).getAllByRole('listitem').length).toBeGreaterThan(0)
      expect(within(card).getByRole('button', { name: `Connect with ${name.split(' ')[0]}` })).toBeTruthy()
      expect(within(card).queryByText(/fallback/i)).toBeNull()
    }
    expect(within(cardFor('Karthik Iyer')).getByText('M.Sc. Data Science · University of Mannheim, Germany · 2024')).toBeTruthy()
    expect(within(cardFor('Karthik Iyer')).getByText('Now: Data Scientist at a Munich insurtech')).toBeTruthy()
  })

  it('"How is this calculated?" expands to show the 5 weights', async () => {
    const { user } = await setup()
    await searchRiya(user)
    const summary = screen.getByText('How is this calculated?')
    const details = summary.closest('details')!
    expect(details.open).toBe(false)
    await user.click(summary)
    expect(details.open).toBe(true)
    const text = details.textContent!
    for (const line of ['35%Skills', '20%Industry', '20%Experience', '15%City', '10%Extracurriculars']) {
      expect(text.replace(/\s/g, '')).toContain(line)
    }
  })

  it('Connect opens inline, with sourced email, links, and an editable draft that copies', async () => {
    const { user } = await setup()
    await searchRiya(user)
    const card = cardFor('Karthik Iyer')
    const connect = within(card).getByRole('button', { name: 'Connect with Karthik' })
    expect(connect.getAttribute('aria-expanded')).toBe('false')
    const locationBefore = window.location.href

    await user.click(connect)
    expect(connect.getAttribute('aria-expanded')).toBe('true')
    expect(window.location.href).toBe(locationBefore)
    const panel = document.getElementById(connect.getAttribute('aria-controls')!)!
    expect(card.contains(panel)).toBe(true)

    expect(within(panel).getByText('hello@karthik-iyer.example')).toBeTruthy()
    expect(within(panel).getByText('Source: Published on their own site')).toBeTruthy()
    for (const link of within(panel).getAllByRole('link')) {
      const href = link.getAttribute('href')!
      expect(() => new URL(href), href).not.toThrow()
      if (link.getAttribute('target') === '_blank') expect(link.getAttribute('rel')).toContain('noopener')
    }

    const subject = within(panel).getByLabelText('Subject') as HTMLInputElement
    const body = within(panel).getByLabelText('Message') as HTMLTextAreaElement
    expect(subject.value).toBe('Aspiring Data Science student from Bangalore: 30 minutes of your advice?')
    expect(body.value).toMatch(/^Hi Karthik,/)
    await user.clear(subject)
    await user.type(subject, 'Quick question about Mannheim')
    await user.type(body, ' P.S. Edited.')
    expect(subject.value).toBe('Quick question about Mannheim')
    expect(body.value.endsWith('P.S. Edited.')).toBe(true)

    await user.click(within(panel).getByRole('button', { name: 'Copy email' }))
    const copied = await navigator.clipboard.readText()
    expect(copied.startsWith('Subject: Quick question about Mannheim\n\nHi Karthik,')).toBe(true)
    expect(copied.endsWith('P.S. Edited.')).toBe(true)
    expect(within(panel).getByRole('status').textContent).toBe('Subject and message copied to your clipboard.')
    expect(within(panel).getByRole('link', { name: 'Open in email app' }).getAttribute('href')).toMatch(
      /^mailto:hello@karthik-iyer\.example\?subject=Quick%20question/,
    )
  })

  it('copy failure falls back to selecting the text with instructions', async () => {
    const { user } = await setup()
    await searchRiya(user)
    await user.click(screen.getByRole('button', { name: 'Connect with Karthik' }))
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    await user.click(screen.getByRole('button', { name: 'Copy email' }))
    expect(await screen.findByText(/Couldn’t copy automatically/)).toBeTruthy()
  })

  it('no public email: says so, keeps LinkedIn and the draft, hides "Open in email app"', async () => {
    const { user } = await setup()
    await searchRiya(user)
    const card = cardFor('Divya Krishnan')
    await user.click(within(card).getByRole('button', { name: 'Connect with Divya' }))
    expect(within(card).getByText(/hasn’t published an email address/)).toBeTruthy()
    expect(within(card).getByRole('link', { name: /linkedin/i })).toBeTruthy()
    expect((within(card).getByLabelText('Message') as HTMLTextAreaElement).value).toMatch(/^Hi Divya,/)
    expect(within(card).queryByRole('link', { name: 'Open in email app' })).toBeNull()
    expect(within(card).queryByText(/@/)).toBeNull()
  })

  it('does not remount: draft edits survive closing the panel and editing the form', async () => {
    const { user } = await setup()
    await searchRiya(user)
    const connect = screen.getByRole('button', { name: 'Connect with Karthik' })
    await user.click(connect)
    const body = screen.getByLabelText('Message') as HTMLTextAreaElement
    await user.type(body, ' KEEP-ME')

    await user.click(screen.getByRole('button', { name: 'Hide contact details' }))
    await user.type(field(/current city/i), 'x')
    await user.click(connect)

    expect(screen.getByLabelText('Message')).toBe(body)
    expect(body.value.endsWith('KEEP-ME')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Your 3 alumni matches' })).toBeTruthy()
  })
})

describe('limited and empty states', () => {
  it('Mechanical Engineering in Germany: says only 2 exact, labels the fallback, never presents it as exact', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: /aniket jadhav/i }))
    await user.click(submit())
    expect(await screen.findByRole('heading', { name: '2 exact matches + 1 fallback' })).toBeTruthy()
    expect(screen.getByRole('note').textContent).toContain('Only 2 alumni in our network studied Mechanical Engineering in Germany.')
    expect(screen.queryByText(/People who studied Mechanical Engineering in Germany/)).toBeNull()

    const all = cards()
    expect(all).toHaveLength(3)
    const fallbacks = all.filter((c) => c.textContent!.includes('Fallback match.'))
    expect(fallbacks).toHaveLength(1)
    expect(fallbacks[0].textContent).toContain('Fallback match. Studied Mechanical Engineering in United States, not Germany.')
    expect(fallbacks[0].textContent).toContain('Purdue University, United States')

    // Every card without the fallback label really did study the requested degree in Germany.
    for (const card of all.filter((c) => !fallbacks.includes(c))) {
      expect(card.textContent).toMatch(/M\.Sc\. Mechanical Engineering · .+, Germany/)
    }

    // Its outreach email says what they actually studied.
    await user.click(within(fallbacks[0]).getByRole('button', { name: 'Connect with Sahil' }))
    const body = (within(fallbacks[0]).getByLabelText('Message') as HTMLTextAreaElement).value
    expect(body).toContain('in United States rather than Germany')
  })

  it('no matching alumni: shows the empty state and no cards', async () => {
    const { user } = await setup()
    const stream = field(/degree you want to study/i)
    await user.clear(stream)
    await user.type(stream, 'MS in Marine Biology')
    await user.click(submit())
    expect(await screen.findByRole('heading', { name: 'No alumni for MS in Marine Biology in Germany yet' })).toBeTruthy()
    expect(cards()).toHaveLength(0)
  })
})

describe('daily limit (3 new alumni per day, demo-only, in localStorage)', () => {
  const allowanceText = () => screen.getByText(/alumni left today|seen today’s 3 alumni/).closest('p')!.textContent
  const storedIds = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')?.alumniIds ?? []

  it('shows the full allowance on load, and loading the page counts nothing', async () => {
    await setup()
    expect(allowanceText()).toBe('3 of 3 new alumni left today. Seeing the same alumni again is free.')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('counts the 3 alumni once they are shown, and re-running the same search stays free', async () => {
    const { user } = await setup()
    await searchRiya(user)
    expect(storedIds()).toEqual(['ds-de-01', 'ds-de-06', 'ds-de-02'])
    expect(allowanceText()).toBe('You’ve seen today’s 3 alumni. Your allowance resets at midnight.')

    await user.click(submit())
    expect(await screen.findByRole('heading', { name: 'Your 3 alumni matches' })).toBeTruthy()
    expect(cards()).toHaveLength(3)
    expect(storedIds()).toHaveLength(3)
  })

  it('blocks a search for different alumni once the limit is used, with a friendly explanation and a demo reset', async () => {
    const { user } = await setup()
    await searchRiya(user)

    await user.click(screen.getByRole('button', { name: /aniket jadhav/i }))
    await user.click(submit())
    const heading = await screen.findByRole('heading', { name: 'You’ve seen today’s 3 alumni' })
    expect(document.activeElement).toBe(heading)
    expect(cards()).toHaveLength(0)
    expect(screen.getByText(/resets at midnight/, { selector: 'section p' })).toBeTruthy()
    expect(screen.getByText(/already seen today are always free/)).toBeTruthy()
    expect(storedIds()).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Reset demo allowance' }))
    expect(allowanceText()).toMatch(/^3 of 3 new alumni left today/)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'You’ve seen today’s 3 alumni' })).toBeNull()

    await user.click(submit())
    expect(await screen.findByRole('heading', { name: '2 exact matches + 1 fallback' })).toBeTruthy()
  })

  it('explains a partial shortfall', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), alumniIds: ['cs-us-01'] }))
    const { user } = await setup()
    expect(allowanceText()).toMatch(/^2 of 3 new alumni left today/)
    await user.click(submit())
    expect(
      await screen.findByRole('heading', { name: 'This search needs 3 new alumni, and you have 2 left today' }),
    ).toBeTruthy()
  })

  it('persists across a page reload, and yesterday’s usage does not count', async () => {
    const first = await setup()
    await searchRiya(first.user)
    cleanup()
    await setup()
    expect(allowanceText()).toMatch(/^You’ve seen today’s 3 alumni/)
    cleanup()

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: '2000-01-01', alumniIds: ['ds-de-01', 'ds-de-06', 'ds-de-02'] }),
    )
    await setup()
    expect(allowanceText()).toMatch(/^3 of 3 new alumni left today/)
  })

  it('unknown profiles and searches with no results cost nothing', async () => {
    const { user } = await setup()
    const url = field(/linkedin profile url/i)
    await user.clear(url)
    await user.type(url, 'https://www.linkedin.com/in/someone-else')
    await user.click(submit())
    await screen.findByRole('heading', { name: 'We couldn’t read that profile' })

    await user.click(screen.getAllByRole('button', { name: /riya deshpande/i })[0])
    const stream = field(/degree you want to study/i)
    await user.clear(stream)
    await user.type(stream, 'MS in Marine Biology')
    await user.click(submit())
    await screen.findByRole('heading', { name: /No alumni for MS in Marine Biology/ })

    expect(storedIds()).toEqual([])
    expect(allowanceText()).toMatch(/^3 of 3 new alumni left today/)
  })

  it('fails open if the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { user } = await setup()
    await searchRiya(user)
    expect(cards()).toHaveLength(3)
  })
})

describe('keyboard only', () => {
  it('can search, expand the explanation, connect and copy without a mouse', async () => {
    const { user } = await setup()
    await user.tab()
    expect(document.activeElement).toBe(field(/linkedin profile url/i))
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(field(/current city/i))
    await user.tab()
    expect(document.activeElement).toBe(submit())
    await user.keyboard('{Enter}')
    await screen.findByRole('heading', { name: 'Your 3 alumni matches' })

    // <summary> is natively focusable and toggles on Enter/Space in browsers. jsdom doesn't implement that
    // keyboard activation, so here we only check it can take focus; the real toggle is checked in Chrome.
    const summary = screen.getByText('How is this calculated?')
    summary.focus()
    expect(document.activeElement).toBe(summary)

    const connect = screen.getByRole('button', { name: 'Connect with Karthik' })
    connect.focus()
    await user.keyboard(' ')
    expect(connect.getAttribute('aria-expanded')).toBe('true')

    await user.tab() // first item in the panel: the email link
    expect(document.activeElement?.textContent).toBe('hello@karthik-iyer.example')
    const copy = screen.getByRole('button', { name: 'Copy email' })
    copy.focus()
    await user.keyboard('{Enter}')
    expect((await navigator.clipboard.readText()).startsWith('Subject: ')).toBe(true)
  })
})
