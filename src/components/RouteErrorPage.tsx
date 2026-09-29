import { FullPageStatus } from './FullPageStatus'

export function RouteErrorPage() {
  return (
    <FullPageStatus
      title="This page could not be opened"
      message="Return to the patient list and try again. If the problem continues, contact the clinic administrator."
      action={<a className="button button--primary" href="/app/patients">Return to patients</a>}
    />
  )
}
