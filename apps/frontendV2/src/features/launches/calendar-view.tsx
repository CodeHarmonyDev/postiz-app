import clsx from 'clsx'
import { useCalendarPosts } from './use-calendar-posts'
import { PostCard } from './post-card'

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/40" />
        </div>
      ))}
    </div>
  )
}

export function CalendarView() {
  const {
    postsByDay,
    weekDays,
    weekOffset,
    isLoading,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useCalendarPosts()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Previous
          </button>
          {weekOffset !== 0 ? (
            <button
              type="button"
              onClick={goToCurrentWeek}
              className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/20"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            onClick={goToNextWeek}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Next
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {weekDays[0]?.label} &ndash; {weekDays[6]?.label}
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayPosts = postsByDay.get(day.date) ?? []

            return (
              <div key={day.date} className="space-y-2">
                <p
                  className={clsx(
                    'text-xs font-semibold uppercase tracking-[0.18em]',
                    day.isToday ? 'text-sky-300' : 'text-slate-500',
                  )}
                >
                  {day.label}
                  {day.isToday ? (
                    <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
                  ) : null}
                </p>

                {dayPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800/60 p-3 text-center text-xs text-slate-600">
                    No posts
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayPosts.map((post) => (
                      <PostCard key={`${post.id}-${post.publishDate}`} post={post} compact />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
