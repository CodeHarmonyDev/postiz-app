import { useState } from 'react'
import clsx from 'clsx'
import { CalendarView } from './calendar-view'
import { UpcomingList } from './upcoming-list'

type LaunchesTab = 'calendar' | 'upcoming'

const tabs: Array<{ id: LaunchesTab; label: string; description: string }> = [
  { id: 'calendar', label: 'Calendar', description: 'Weekly view of scheduled posts' },
  { id: 'upcoming', label: 'Upcoming', description: 'Chronological queue' },
]

export function LaunchesView() {
  const [activeTab, setActiveTab] = useState<LaunchesTab>('calendar')

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
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
      </div>

      {activeTab === 'calendar' ? <CalendarView /> : <UpcomingList />}
    </div>
  )
}
