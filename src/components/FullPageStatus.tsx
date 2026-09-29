import type { ReactNode } from 'react'

interface FullPageStatusProps {
  title: string
  message: string
  busy?: boolean
  action?: ReactNode
}

export function FullPageStatus({ title, message, busy = false, action }: FullPageStatusProps) {
  return (
    <main className="status-page" aria-live="polite">
      <div className="status-card">
        <span className={busy ? 'status-mark status-mark--busy' : 'status-mark'} aria-hidden="true">
          {busy ? '' : 'i'}
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
        {action ? <div className="status-card__action">{action}</div> : null}
      </div>
    </main>
  )
}
