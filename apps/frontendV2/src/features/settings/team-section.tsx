import { useState } from 'react'
import clsx from 'clsx'
import { useTeamMembers, type TeamMember } from './use-settings'

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  USER: 'Member',
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
  ADMIN: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  USER: 'border-slate-700 bg-slate-800/40 text-slate-400',
}

function MemberAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-9 w-9 rounded-full border border-slate-700/50 object-cover"
      />
    )
  }

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 bg-gradient-to-br from-sky-500/20 to-orange-500/20 text-xs font-bold text-white">
      {initials || '?'}
    </div>
  )
}

function MemberRow({
  member,
  isCurrentUser,
  canManage,
  onChangeRole,
  onRemove,
}: {
  member: TeamMember
  isCurrentUser: boolean
  canManage: boolean
  onChangeRole: (membershipId: string, role: 'SUPERADMIN' | 'ADMIN' | 'USER') => void
  onRemove: (member: TeamMember) => void
}) {
  const displayName = member.fullName || member.email || 'Unknown'

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition',
        member.disabled
          ? 'border-slate-800/50 bg-slate-950/20 opacity-50'
          : 'border-slate-800 bg-slate-950/40',
      )}
    >
      <MemberAvatar imageUrl={member.imageUrl} name={displayName} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{displayName}</p>
          {isCurrentUser && (
            <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              You
            </span>
          )}
          {member.disabled && (
            <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              Removed
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500">
          {member.email || 'No email'}{' '}
          &middot;{' '}
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Role badge / selector */}
      <div className="flex items-center gap-2">
        {canManage && !isCurrentUser && !member.disabled ? (
          <select
            value={member.role}
            onChange={(e) =>
              onChangeRole(
                member.membershipId,
                e.target.value as 'SUPERADMIN' | 'ADMIN' | 'USER',
              )
            }
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none transition focus:border-sky-400"
          >
            <option value="USER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERADMIN">Super Admin</option>
          </select>
        ) : (
          <span
            className={clsx(
              'rounded-lg border px-2.5 py-1 text-xs font-medium',
              ROLE_COLORS[member.role] || ROLE_COLORS.USER,
            )}
          >
            {ROLE_LABELS[member.role] || member.role}
          </span>
        )}

        {canManage && !isCurrentUser && !member.disabled && (
          <button
            type="button"
            onClick={() => onRemove(member)}
            className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-500 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
            title="Remove member"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function TeamSection() {
  const { members, isLoading, currentUserId, currentRole, changeRole, removeMember } =
    useTeamMembers()
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null)

  const canManage = currentRole === 'ADMIN' || currentRole === 'SUPERADMIN'
  const activeMembers = members.filter((m) => !m.disabled)
  const removedMembers = members.filter((m) => m.disabled)

  async function handleRemove() {
    if (!confirmRemove) return
    await removeMember(confirmRemove.membershipId)
    setConfirmRemove(null)
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Team</h3>
          <p className="mt-1 text-sm text-slate-400">
            {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
            </div>
            <p className="text-sm text-slate-400">Loading team...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <MemberRow
              key={member.membershipId}
              member={member}
              isCurrentUser={member.userId === currentUserId}
              canManage={canManage}
              onChangeRole={changeRole}
              onRemove={setConfirmRemove}
            />
          ))}

          {removedMembers.length > 0 && (
            <details className="pt-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 hover:text-slate-400">
                {removedMembers.length} removed member{removedMembers.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-2">
                {removedMembers.map((member) => (
                  <MemberRow
                    key={member.membershipId}
                    member={member}
                    isCurrentUser={member.userId === currentUserId}
                    canManage={false}
                    onChangeRole={changeRole}
                    onRemove={setConfirmRemove}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="panel-surface w-full max-w-sm space-y-4 p-6">
            <h3 className="text-lg font-semibold text-white">Remove member?</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to remove{' '}
              <span className="font-medium text-white">
                {confirmRemove.fullName || confirmRemove.email || 'this member'}
              </span>{' '}
              from the workspace? They will lose access to all resources.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRemove()}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
