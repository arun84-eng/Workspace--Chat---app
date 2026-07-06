import { useEffect, useState } from 'react'
import { messageApi } from '../../api'
import type { Message, User } from '../../types/api'
import { useInterval } from '../../hooks/useInterval'
import { Avatar } from '../ui/Avatar'
import { Composer } from './Composer'
import { formatMessageTime } from '../../lib/format'

export function ThreadPanel({
  messageId,
  usersById,
  onClose,
  onChanged,
}: {
  messageId: number
  channelId: number
  currentUser: User
  usersById: Map<number, User>
  onClose: () => void
  onChanged: () => void
}) {
  const [root, setRoot] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await messageApi.thread(messageId)
      const data = Array.isArray(res.data) ? res.data : []
      // Thread endpoint may or may not include the root message itself —
      // handle both shapes defensively rather than assuming.
      const rootMsg = data.find((m) => m.id === messageId) ?? null
      setRoot(rootMsg)
      setReplies(data.filter((m) => m.id !== messageId))
    } catch {
      // keep whatever we already have rather than blanking the panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId])

  useInterval(load, 3000)

  async function handleReply(content: string) {
    await messageApi.threadReply({ parent_id: messageId, content })
    await load()
    onChanged()
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l-2 border-ink bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink px-3 py-3">
        <h3 className="font-display text-sm font-bold">Thread</h3>
        <button onClick={onClose} className="border-2 border-ink px-2 text-sm hover:bg-accent">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && <p className="py-4 text-center text-xs text-ink-soft">Loading…</p>}

        {root && (
          <div className="mb-3 border-b-2 border-dashed border-ink/30 pb-3">
            <div className="flex items-baseline gap-2">
              <Avatar id={root.sender_id} name={usersById.get(root.sender_id)?.username ?? `user ${root.sender_id}`} size={24} />
              <span className="text-sm font-bold">
                {usersById.get(root.sender_id)?.username ?? `user ${root.sender_id}`}
              </span>
              <span className="font-mono text-[10px] text-ink-soft">{formatMessageTime(root.created_at)}</span>
            </div>
            <p className="mt-1 text-sm">{root.content}</p>
          </div>
        )}

        {replies.length === 0 && !loading && (
          <p className="py-2 text-xs text-ink-soft">No replies yet.</p>
        )}

        {replies.map((r) => (
          <div key={r.id} className="mb-2.5 flex gap-2">
            <Avatar id={r.sender_id} name={usersById.get(r.sender_id)?.username ?? `user ${r.sender_id}`} size={24} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold">{usersById.get(r.sender_id)?.username ?? `user ${r.sender_id}`}</span>
                <span className="font-mono text-[10px] text-ink-soft">{formatMessageTime(r.created_at)}</span>
              </div>
              <p className="text-sm">{r.content}</p>
            </div>
          </div>
        ))}
      </div>

      <Composer placeholder="Reply in thread" onSend={handleReply} />
    </div>
  )
}
