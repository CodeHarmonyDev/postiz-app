import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { SectionPlaceholder } from '../features/shell/section-placeholder'

export const Route = createFileRoute('/settings')({
  beforeLoad: requireSignedIn,
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <AuthenticatedAppPage
      title="Settings"
      description="Settings and team management depend on the new Convex tenancy model, so this page is positioned around organization state rather than the old cookie-driven assumptions."
    >
      <SectionPlaceholder
        title="Organization and membership settings should hang off Convex tenancy."
        summary="V2 resolves the current organization, role, and membership from Convex. Settings pages should build on top of Convex mutations for profile, team, and workspace management."
        milestones={[
          'Build workspace and profile settings with Convex mutations.',
          'Add team membership management (invite, role change, remove).',
          'Wire billing and API key management through Convex actions.',
        ]}
      />
    </AuthenticatedAppPage>
  )
}
