import { SIGNALS, weightPercent } from '../lib/explain'

export function HowCalculated({ stream, country }: { stream: string; country: string }) {
  return (
    <details className="group rounded-xl border border-line bg-white px-5 py-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-accent-strong [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <span aria-hidden className="mr-1.5 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
        How is this calculated?
      </summary>
      <div className="mt-3 text-sm text-muted">
        <p>
          We start with people who studied <strong className="font-medium text-ink">{stream}</strong> in{' '}
          <strong className="font-medium text-ink">{country}</strong>. Then we compare your profile today with each
          person’s profile <em>from before they started their degree</em>, and score the similarity out of 100:
        </p>
        <ul className="mt-3 divide-y divide-line">
          {SIGNALS.map((signal) => (
            <li key={signal.key} className="flex items-baseline gap-4 py-2">
              <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-ink">
                {weightPercent(signal.key)}%
              </span>
              <span>
                <span className="font-medium text-ink">{signal.label}</span>
                <span className="block sm:inline"> · {signal.description}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Only if fewer than 3 people match the degree and country exactly do we look further: same degree in another
          country, or a related degree in the same country. We say so, and label those people “Fallback match”.
        </p>
      </div>
    </details>
  )
}
