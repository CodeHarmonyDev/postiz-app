import { createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '../app/router-guards'
import { AuthenticatedAppPage } from '../features/shell/app-shell'
import { MediaView } from '../features/media/media-view'

export const Route = createFileRoute('/media')({
  beforeLoad: requireSignedIn,
  component: MediaPage,
})

function MediaPage() {
  return (
    <AuthenticatedAppPage
      title="Media"
      description="Upload, organize, and manage your media assets. Tag, search, and filter across all your images, videos, and files."
    >
      <MediaView />
    </AuthenticatedAppPage>
  )
}
