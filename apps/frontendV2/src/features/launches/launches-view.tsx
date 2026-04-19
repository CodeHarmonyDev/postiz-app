import { useState } from 'react'
import clsx from 'clsx'
import { CalendarView } from './calendar-view'
import { UpcomingList } from './upcoming-list'
import { PostComposer } from './post-composer'

type LaunchesTab = 'calendar' | 'upcoming'

const tabs: Array<{ id: LaunchesTab; label: string; description: string }> = [
  { id: 'calendar', label: 'Calendar', description: 'Weekly view of scheduled posts' },
  { id: 'upcoming', label: 'Upcoming', description: 'Chronological queue' },
]

export function LaunchesView() {
  const [activeTab, setActiveTab] = useState<LaunchesTab>('calendar')
  const [showComposer, setShowComposer] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-xl border px-4 py-2 text-sm font-medium transition',
              activeTab === tab.id
                ? 'border-sky-400/60 bg-sky-400/10 text-white'
                : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New post
        </button>
      </div>

      {activeTab === 'calendar' ? <CalendarView /> : <UpcomingList />}

      {showComposer && <PostComposer onClose={() => setShowComposer(false)} />}
    </div>
  )
}
