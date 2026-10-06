import { matchStrength } from '../lib/explain'

/** Score as a ring with the number inside, plus a plain-language label. */
export function ScoreBadge({ score, muted = false }: { score: number; muted?: boolean }) {
  const color = muted ? 'var(--color-fallback)' : 'var(--color-accent)'
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        role="img"
        aria-label={`${score} out of 100 profile similarity: ${matchStrength(score)}`}
        className="grid size-16 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--color-line) 0deg)` }}
      >
        <div className="grid size-[3.25rem] place-items-center rounded-full bg-white">
          <span className="text-lg font-semibold tabular-nums text-ink">{score}</span>
        </div>
      </div>
      <span className="text-center text-xs font-medium text-muted">{matchStrength(score)}</span>
    </div>
  )
}
