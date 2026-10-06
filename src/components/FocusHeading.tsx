import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A heading that takes focus when it mounts, so keyboard and screen-reader users land on new
 * results (and the page scrolls to them) after submitting the form.
 */
export function FocusHeading({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <h2 id={id} ref={ref} tabIndex={-1} className={`scroll-mt-6 text-ink outline-none ${className ?? ''}`}>
      {children}
    </h2>
  )
}
