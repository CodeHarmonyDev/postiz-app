import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { LaunchesView } from '../features/launches/launches-view'

export const Route = createFileRoute('/launches')({
  beforeLoad: requireSignedIn,
  component: LaunchesPage,
})

function LaunchesPage() {
  return (
    <AuthenticatedAppPage
      title="Launches"
      description="Weekly calendar and upcoming post queue for the active workspace. All data is real-time from Convex."
    >
      <LaunchesView />
    </AuthenticatedAppPage>
  )
}
