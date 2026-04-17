import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { IntegrationsList } from '../features/integrations/integrations-list'

export const Route = createFileRoute('/integrations')({
  beforeLoad: requireSignedIn,
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <AuthenticatedAppPage
      title="Integrations"
      description="Social accounts and publishing channels connected to this workspace. Powered by Convex real-time queries."
    >
      <IntegrationsList />
    </AuthenticatedAppPage>
  )
}
