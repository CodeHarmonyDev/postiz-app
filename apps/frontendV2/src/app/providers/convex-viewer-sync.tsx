import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'

export function ConvexViewerSync(): null {
  const { isSignedIn } = useUser()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const hasAttemptedSync = useRef(false)
  const syncViewer = useMutation(api.users.syncViewer)

  useEffect(() => {
    if (!isSignedIn || isLoading || !isAuthenticated || hasAttemptedSync.current) {
      return
    }

    hasAttemptedSync.current = true

    void syncViewer({}).catch(() => {
      hasAttemptedSync.current = false
    })
  }, [isAuthenticated, isLoading, isSignedIn, syncViewer])

  return null
}
