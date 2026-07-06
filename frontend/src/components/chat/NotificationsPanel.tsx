import { useEffect, useState } from 'react'
import { notificationsApi } from '../../api'
import type { AppNotification } from '../../types/api'
import { Button } from '../ui/Button'
import { formatMessageTime } from '../../lib/format'

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await notificationsApi.list()
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function markAll() {
    await notificationsApi.markAllRead()
    await load()
  }

  async function markOne(id: number) {
    await notificationsApi.markRead(id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  useEffect(() => { load() }, [])

  const unread = items.filter((n) => !n.read)

  return (
    <div className="flex w-80 shrink-0 flex-col border-l-2 border-ink bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink px-3 py-3">
        <h3 className="font-display text-sm font-bold">
          Notifications{unread.length > 0 && (
            <span className="ml-2 border-2 border-ink bg-flag px-1.5 font-mono text-[10px] text-paper">
              {unread.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <Button size="sm" variant="ghost" onClick={markAll}>Mark all read</Button>
          )}
          <button onClick={onClose} className="border-2 border-ink px-2 text-sm hover:bg-accent">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-3 py-4 text-center text-xs text-ink-soft">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-ink-soft">You're all caught up.</p>
        )}
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex gap-2 border-b border-ink/10 px-3 py-2.5 ${n.read ? 'opacity-50' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-xs ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-soft">{formatMessageTime(n.created_at)}</p>
            </div>
            {!n.read && (
              <button
                onClick={() => markOne(n.id)}
                className="shrink-0 self-start font-mono text-[10px] text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
