import { useUpcomingPosts } from './use-upcoming-posts'
import { PostCard } from './post-card'

function EmptyState() {
  return (
    <div className="panel-soft p-6 text-center">
      <p className="text-sm font-semibold text-slate-300">No upcoming posts</p>
      <p className="mt-1 text-xs text-slate-500">
        Scheduled posts for this workspace will appear here.
      </p>
    </div>
  )
}

export function UpcomingList() {
  const { posts, total, page, hasMore, isLoading, isEmpty, goToNextPage, goToPreviousPage } =
    useUpcomingPosts()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="panel-soft h-20 animate-pulse p-4" />
        ))}
      </div>
    )
  }

  if (isEmpty) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <p>{total} upcoming post{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {page > 0 ? (
            <button
              type="button"
              onClick={goToPreviousPage}
              className="rounded-lg border border-slate-700 px-3 py-1 transition hover:text-white"
            >
              Previous
            </button>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              onClick={goToNextPage}
              className="rounded-lg border border-slate-700 px-3 py-1 transition hover:text-white"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
