import { useState, type FormEvent } from 'react'
import { DEMO_PROFILES, linkedinHandle } from '../data/demoProfiles'
import { DAILY_ALUMNI_LIMIT } from '../config'
import { CITIES, COUNTRIES, STREAMS } from '../data/synonyms'
import { countryLabel, streamLabel } from '../lib/normalize'
import type { SearchInput } from '../types'

type Errors = Partial<Record<keyof SearchInput, string>>

const STREAM_SUGGESTIONS = Object.values(STREAMS).map((s) => (s.label === 'MBA' ? 'MBA' : `MS in ${s.label}`))
const COUNTRY_SUGGESTIONS = Object.entries(COUNTRIES)
  .filter(([id]) => id !== 'india')
  .map(([, c]) => c.label)
const CITY_SUGGESTIONS = Object.values(CITIES).map((c) => c.label)

function validate(values: SearchInput): Errors {
  const errors: Errors = {}
  if (!values.linkedinUrl.trim()) errors.linkedinUrl = 'Paste your LinkedIn profile URL.'
  else if (!linkedinHandle(values.linkedinUrl))
    errors.linkedinUrl = 'That doesn’t look like a LinkedIn profile URL. It should contain linkedin.com/in/your-name.'
  if (!values.stream.trim()) errors.stream = 'Enter the degree you plan to study.'
  if (!values.country.trim()) errors.country = 'Enter the country you want to study in.'
  if (!values.city.trim()) errors.city = 'Enter the city you live in now.'
  return errors
}

interface Props {
  values: SearchInput
  onChange: (values: SearchInput) => void
  onSubmit: (values: SearchInput) => void
  busy: boolean
  /** New alumni the student can still see today */
  remainingToday: number
}

export function SearchForm({ values, onChange, onSubmit, busy, remainingToday }: Props) {
  const [errors, setErrors] = useState<Errors>({})

  function update(field: keyof SearchInput, value: string) {
    onChange({ ...values, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = (Object.keys(found) as (keyof SearchInput)[])[0]
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus()
      return
    }
    onSubmit(values)
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
      <form onSubmit={handleSubmit} noValidate aria-label="Find alumni">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="linkedinUrl"
            label="Your LinkedIn profile URL"
            className="sm:col-span-2"
            value={values.linkedinUrl}
            error={errors.linkedinUrl}
            onChange={(v) => update('linkedinUrl', v)}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://www.linkedin.com/in/your-name"
          />
          <Field
            id="stream"
            label="Degree you want to study"
            value={values.stream}
            error={errors.stream}
            onChange={(v) => update('stream', v)}
            suggestions={STREAM_SUGGESTIONS}
            placeholder="e.g. MS in Data Science"
          />
          <Field
            id="country"
            label="Target country"
            value={values.country}
            error={errors.country}
            onChange={(v) => update('country', v)}
            suggestions={COUNTRY_SUGGESTIONS}
            autoComplete="off"
            placeholder="e.g. Germany"
          />
          <Field
            id="city"
            label="Your current city"
            className="sm:col-span-2"
            value={values.city}
            error={errors.city}
            onChange={(v) => update('city', v)}
            suggestions={CITY_SUGGESTIONS}
            autoComplete="address-level2"
            placeholder="e.g. Bangalore"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Finding your matches…' : 'Find my 3 alumni matches'}
        </button>
        <p aria-live="polite" className="mt-2.5 text-center text-sm text-muted">
          {remainingToday > 0 ? (
            <>
              <span className="font-medium text-ink">
                {remainingToday} of {DAILY_ALUMNI_LIMIT}
              </span>{' '}
              new alumni left today. Seeing the same alumni again is free.
            </>
          ) : (
            <>You’ve seen today’s {DAILY_ALUMNI_LIMIT} alumni. Your allowance resets at midnight.</>
          )}
        </p>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm text-muted">
          This prototype can’t read live LinkedIn profiles, so it ships with sample students. Try one:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {DEMO_PROFILES.map((demo) => {
            const active = values.linkedinUrl === demo.linkedinUrl
            return (
              <li key={demo.linkedinUrl}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setErrors({})
                    onChange({ linkedinUrl: demo.linkedinUrl, ...demo.suggestedSearch })
                  }}
                  className={`rounded-full border px-3 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active
                      ? 'border-accent bg-accent-soft text-accent-strong'
                      : 'border-line bg-paper text-ink hover:border-muted'
                  }`}
                >
                  <span className="font-medium">{demo.profile.name}</span>
                  <span className="text-muted">
                    {' '}
                    · {streamLabel(demo.suggestedSearch.stream)}, {countryLabel(demo.suggestedSearch.country)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

interface FieldProps {
  id: keyof SearchInput
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  suggestions?: string[]
  className?: string
  type?: string
  inputMode?: 'url' | 'text'
  autoComplete?: string
  placeholder?: string
}

function Field({ id, label, value, error, onChange, suggestions, className = '', ...inputProps }: FieldProps) {
  const inputId = `field-${id}`
  const errorId = `${inputId}-error`
  const listId = suggestions ? `${inputId}-options` : undefined
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-2 focus:outline-offset-0 focus:outline-accent ${
          error ? 'border-danger' : 'border-line'
        }`}
        {...inputProps}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
