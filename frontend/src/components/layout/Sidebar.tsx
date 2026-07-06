import { useMemo, useState } from 'react'
import type { Channel, User } from '../../types/api'
import { Avatar } from '../ui/Avatar'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

type View = { kind: 'channel'; id: number } | { kind: 'dm'; id: number } | null

export function Sidebar({
  workspaceName,
  channels,
  dmUsers,
  allUsers,
  onlineUserIds,
  activeView,
  onSelectChannel,
  onSelectDm,
  onCreateChannel,
  currentUser,
  onLogout,
  unreadDmCount,
  unreadNotifCount,
  dmUnreadMap,
}: {
  workspaceName: string
  channels: Channel[]
  dmUsers: User[]
  allUsers: User[]
  onlineUserIds: Set<number>
  activeView: View
  onSelectChannel: (id: number) => void
  onSelectDm: (userId: number) => void
  onCreateChannel: (name: string) => Promise<void>
  currentUser: User
  onLogout: () => void
  unreadDmCount: number
  unreadNotifCount: number
  dmUnreadMap: Record<number, number>
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onCreateChannel(name.trim())
      setName('')
      setShowCreate(false)
    } finally {
      setSubmitting(false)
    }
  }

  // users who are NOT already in recent DM conversations
  const recentIds = useMemo(() => new Set(dmUsers.map((u) => u.id)), [dmUsers])
  const availableUsers = allUsers.filter((u) => !recentIds.has(u.id))

  return (
    <div className="flex w-72 shrink-0 flex-col border-r-2 border-ink bg-panel">
      <div className="border-b-2 border-ink px-4 py-3">
        <h1 className="truncate font-display text-lg font-bold">{workspaceName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* CHANNELS */}
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Channels</span>
          <button
            onClick={() => setShowCreate(true)}
            className="font-mono text-sm text-ink-soft hover:text-ink"
            aria-label="Create channel"
          >
            +
          </button>
        </div>

        <ul className="mb-4 space-y-0.5">
          {channels.map((ch) => (
            <li key={ch.id}>
              <button
                onClick={() => onSelectChannel(ch.id)}
                className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm ${
                  activeView?.kind === 'channel' && activeView.id === ch.id
                    ? 'bg-accent font-medium text-ink'
                    : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <span className="font-mono">#</span>
                <span className="truncate">{ch.name}</span>
              </button>
            </li>
          ))}
          {channels.length === 0 && (
            <li className="px-2 py-1 text-xs text-ink-soft">No channels yet</li>
          )}
        </ul>

        {/* RECENT DMs */}
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Recent chats</span>
          {unreadDmCount > 0 && (
            <span className="border-2 border-ink bg-flag px-1 font-mono text-[10px] text-paper">
              {unreadDmCount}
            </span>
          )}
        </div>

        <ul className="mb-4 space-y-0.5">
          {dmUsers.map((u) => {
            const unread = dmUnreadMap[u.id] ?? 0
            const online = onlineUserIds.has(u.id)

            return (
              <li key={u.id}>
                <button
                  onClick={() => onSelectDm(u.id)}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                    activeView?.kind === 'dm' && activeView.id === u.id
                      ? 'bg-accent font-medium text-ink'
                      : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  <Avatar id={u.id} name={u.username} size={20} online={online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{u.username}</span>
                      {unread > 0 && (
                        <span className="border-2 border-ink bg-flag px-1 font-mono text-[10px] text-paper">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="truncate font-mono text-[10px] text-ink-soft">
                      {online ? 'online' : 'offline'}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}

          {dmUsers.length === 0 && (
            <li className="px-2 py-1 text-xs text-ink-soft">No recent chats</li>
          )}
        </ul>

        {/* START NEW DM */}
        <div className="mb-1 px-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">Start a chat</span>
        </div>

        <ul className="space-y-0.5">
          {availableUsers.map((u) => {
            const online = onlineUserIds.has(u.id)
            return (
              <li key={u.id}>
                <button
                  onClick={() => onSelectDm(u.id)}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                    activeView?.kind === 'dm' && activeView.id === u.id
                      ? 'bg-accent font-medium text-ink'
                      : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  <Avatar id={u.id} name={u.username} size={18} online={online} />
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{u.username}</span>
                    <span className="font-mono text-[10px] text-ink-soft">
                      {online ? 'online' : 'offline'}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}

          {availableUsers.length === 0 && (
            <li className="px-2 py-1 text-xs text-ink-soft">No other users available</li>
          )}
        </ul>
      </div>

      {/* CURRENT USER FOOTER */}
      <div className="flex items-center gap-2 border-t-2 border-ink px-3 py-2.5">
        <Avatar id={currentUser.id} name={currentUser.username} size={32} online />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentUser.username}</p>
          <p className="truncate font-mono text-[11px] text-ink-soft">{currentUser.email}</p>
        </div>

        {unreadNotifCount > 0 && (
          <span className="border-2 border-ink bg-flag px-1.5 py-0.5 font-mono text-[10px] text-paper">
            {unreadNotifCount}
          </span>
        )}

        <button
          onClick={onLogout}
          className="border-2 border-ink px-2 py-1 font-mono text-[11px] hover:bg-accent"
          title="Log out"
        >
          exit
        </button>
      </div>

      {showCreate && (
        <Modal title="Create channel" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create channel'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}