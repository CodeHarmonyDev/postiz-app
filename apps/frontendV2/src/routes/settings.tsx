import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { SettingsView } from '../features/settings/settings-view'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireSignedIn,
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <AuthenticatedAppPage
      title="Settings"
      description="Manage your profile, workspace, team members, and API access."
    >
      <SettingsView />
    </AuthenticatedAppPage>
  )
}
