import { useEffect, useState } from 'react'
import { channelApi } from '../../api'
import type { Message } from '../../types/api'
import { StickyNote } from '../ui/StickyNote'

export function PinnedBar({ channelId, refreshKey }: { channelId: number; refreshKey: number }) {
  const [pinned, setPinned] = useState<Message[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    channelApi
      .pinnedMessages(channelId)
      .then((res) => setPinned(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPinned([]))
  }, [channelId, refreshKey])

  if (pinned.length === 0) return null

  return (
    <div className="border-b-2 border-ink bg-panel px-4 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink"
      >
        📌 {pinned.length} pinned {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-3 pb-1">
          {pinned.map((m, i) => (
            <div key={m.id} className="w-48">
              <StickyNote index={i}>
                <p className="line-clamp-3">{m.content}</p>
              </StickyNote>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
