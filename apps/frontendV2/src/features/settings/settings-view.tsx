import { useState } from 'react'
import clsx from 'clsx'
import { ProfileSection } from './profile-section'
import { WorkspaceSection } from './workspace-section'
import { TeamSection } from './team-section'
import { ApiKeysSection } from './api-keys-section'

type SettingsTab = 'profile' | 'workspace' | 'team' | 'api-keys'

const TABS: Array<{ id: SettingsTab; label: string; description: string }> = [
  { id: 'profile', label: 'Profile', description: 'Your personal info' },
  { id: 'workspace', label: 'Workspace', description: 'Organization details' },
  { id: 'team', label: 'Team', description: 'Members and roles' },
  { id: 'api-keys', label: 'API Keys', description: 'Programmatic access' },
]

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-xl border px-4 py-2 text-left transition',
              activeTab === tab.id
                ? 'border-sky-400/60 bg-sky-400/10'
                : 'border-slate-800 bg-slate-950/30 hover:border-slate-600',
            )}
          >
            <p
              className={clsx(
                'text-sm font-medium',
                activeTab === tab.id ? 'text-white' : 'text-slate-400',
              )}
            >
              {tab.label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{tab.description}</p>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/60" />

      {/* Content */}
      {activeTab === 'profile' && <ProfileSection />}
      {activeTab === 'workspace' && <WorkspaceSection />}
      {activeTab === 'team' && <TeamSection />}
      {activeTab === 'api-keys' && <ApiKeysSection />}
    </div>
  )
}
