import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { SectionPlaceholder } from '../features/shell/section-placeholder'

export const Route = createFileRoute('/analytics')({
  beforeLoad: requireSignedIn,
  component: AnalyticsPage,
})

function AnalyticsPage() {
  return (
    <AuthenticatedAppPage
      title="Analytics"
      description="Analytics follows launches and integrations in the scope order. All reporting data comes from Convex queries."
    >
      <SectionPlaceholder
        title="Analytics will be a Convex-first reporting surface."
        summary="This area layers charting and platform-specific insights on top of typed Convex queries scoped to the active organization."
        milestones={[
          'Define Convex queries for post performance and integration metrics.',
          'Build route-local hooks and chart components for key reporting views.',
          'Add test coverage around empty states, organization switching, and chart data transforms.',
        ]}
      />
    </AuthenticatedAppPage>
  )
}
