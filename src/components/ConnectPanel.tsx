import { useId, useRef, useState } from 'react'
import { firstName } from '../lib/explain'
import { draftEmail, type EmailContext } from '../lib/emailTemplate'
import type { Contact, ContactKind, ContactSource } from '../types'

const KIND_LABEL: Record<ContactKind, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  resume: 'Résumé site',
  email: 'Email',
}

const SOURCE_LABEL: Record<ContactSource, string> = {
  'public-profile': 'Public profile',
  'self-published': 'Published on their own site',
  'university-directory': 'Public university alumni directory',
}

const KIND_ORDER: ContactKind[] = ['email', 'linkedin', 'twitter', 'resume']

type CopyState = 'idle' | 'copied' | 'failed'

interface Props extends EmailContext {
  id: string
}

export function ConnectPanel({ id, ...context }: Props) {
  const [draft] = useState(() => draftEmail(context))
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()

  const { alumnus } = context.result
  const name = firstName(alumnus.name)
  const contacts = [...alumnus.contacts].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
  const email = contacts.find((c) => c.kind === 'email')
  const links = contacts.filter((c) => c.kind !== 'email')

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
      setCopyState('copied')
    } catch {
      bodyRef.current?.select()
      setCopyState('failed')
    }
  }

  const mailto = email
    ? `mailto:${email.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : undefined

  return (
    <div id={id} className="mt-5 rounded-xl border border-line bg-paper p-4 sm:p-5">
      <h4 className="text-sm font-semibold text-ink">Ways to reach {name}</h4>

      {email ? (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3.5 py-3">
          <p className="text-sm">
            <span className="font-medium text-ink">Email: </span>
            <a href={`mailto:${email.value}`} className="break-all text-accent-strong underline underline-offset-2">
              {email.value}
            </a>
          </p>
          <p className="mt-0.5 text-xs text-muted">Source: {SOURCE_LABEL[email.source]}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-muted">
          {name} hasn’t published an email address, so we don’t show one. Send the message below through LinkedIn
          instead.
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((contact) => (
          <ContactLink key={contact.kind} contact={contact} />
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        We only show contact details {name} has made public themselves. We never guess or scrape email addresses.
      </p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-semibold text-ink">Your outreach email</h4>
          <span className="text-xs text-muted">Edit freely before sending</span>
        </div>

        <label htmlFor={`${fieldId}-subject`} className="mt-3 block text-xs font-medium text-muted">
          Subject
        </label>
        <input
          id={`${fieldId}-subject`}
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            setCopyState('idle')
          }}
          className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-accent"
        />

        <label htmlFor={`${fieldId}-body`} className="mt-3 block text-xs font-medium text-muted">
          Message
        </label>
        <textarea
          id={`${fieldId}-body`}
          ref={bodyRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            setCopyState('idle')
          }}
          rows={14}
          className="mt-1 block w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed text-ink focus:outline-2 focus:outline-accent"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copyState === 'copied' ? 'Copied' : 'Copy email'}
          </button>
          {mailto && (
            <a
              href={mailto}
              className="rounded-lg border border-accent px-4 py-2.5 text-sm font-semibold text-accent-strong hover:bg-accent-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Open in email app
            </a>
          )}
          <span role="status" className="text-sm text-muted">
            {copyState === 'copied' && 'Subject and message copied to your clipboard.'}
            {copyState === 'failed' && 'Couldn’t copy automatically. The message is selected; press Ctrl+C (⌘C on Mac).'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ContactLink({ contact }: { contact: Contact }) {
  return (
    <li>
      <a
        href={contact.value}
        target="_blank"
        rel="noopener noreferrer"
        title={SOURCE_LABEL[contact.source]}
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {KIND_LABEL[contact.kind]}
        <span aria-hidden className="text-muted">
          ↗
        </span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </li>
  )
}
