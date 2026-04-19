import { useState } from 'react'
import { useOrganizationSettings } from './use-settings'

export function WorkspaceSection() {
  const { organization, membership, updateOrganization } = useOrganizationSettings()

  const [name, setName] = useState(organization?.name ?? '')
  const [description, setDescription] = useState(organization?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!organization) return null

  const isAdmin = membership?.role === 'ADMIN' || membership?.role === 'SUPERADMIN'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return

    setSaving(true)
    setSaved(false)

    try {
      await updateOrganization({
        name: name.trim(),
        description: description.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Workspace</h3>
        <p className="mt-1 text-sm text-slate-400">
          Organization details shared across all members.
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="org-name"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Workspace name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="org-description"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Description
            </label>
            <textarea
              id="org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this workspace for..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-400 resize-none"
            />
          </div>

          {/* Read-only info */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Slug: </span>
                <span className="text-slate-300">{organization.slug || 'none'}</span>
              </div>
              <div>
                <span className="text-slate-500">Short links: </span>
                <span className="text-slate-300">{organization.shortlinkPreference}</span>
              </div>
              <div>
                <span className="text-slate-500">Trial: </span>
                <span className="text-slate-300">
                  {organization.isTrailing ? 'Active' : organization.allowTrial ? 'Available' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save workspace'}
            </button>

            {saved && (
              <span className="text-sm text-emerald-400">Saved</span>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Name: </span>
                <span className="text-white">{organization.name}</span>
              </div>
              {organization.description && (
                <div>
                  <span className="text-slate-500">Description: </span>
                  <span className="text-slate-300">{organization.description}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Slug: </span>
                <span className="text-slate-300">{organization.slug || 'none'}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Only admins can modify workspace settings.
          </p>
        </div>
      )}
    </section>
  )
}
