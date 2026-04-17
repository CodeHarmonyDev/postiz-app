import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { SectionPlaceholder } from '../features/shell/section-placeholder'

export const Route = createFileRoute('/media')({
  beforeLoad: requireSignedIn,
  component: MediaPage,
})

function MediaPage() {
  return (
    <AuthenticatedAppPage
      title="Media"
      description="Media management powered by Convex storage and metadata queries."
    >
      <SectionPlaceholder
        title="Media listing and uploads through Convex storage."
        summary="Media metadata lives in Convex. File uploads use Convex storage with optional Cloudflare R2 for production CDN delivery."
        milestones={[
          'Wire media listing from Convex queries scoped to the active organization.',
          'Implement upload flow using Convex storage API.',
          'Add thumbnail generation and metadata editing through Convex mutations.',
        ]}
      />
    </AuthenticatedAppPage>
  )
}
