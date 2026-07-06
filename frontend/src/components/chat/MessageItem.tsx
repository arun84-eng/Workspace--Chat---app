import { useState } from 'react'
import type { Message, Reaction, User } from '../../types/api'
import { Avatar } from '../ui/Avatar'
import { formatMessageTime } from '../../lib/format'

const QUICK_EMOJI = ['👍', '🎉', '❤️', '😂', '👀']

export function MessageItem({
  message,
  author,
  isOwn,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onReact,
  onOpenThread,
}: {
  message: Message
  author?: User
  isOwn: boolean
  onEdit: (id: number, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onPin: (id: number) => Promise<void>
  onUnpin: (id: number) => Promise<void>
  onReact: (id: number, emoji: string) => Promise<void>
  onOpenThread: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [showEmoji, setShowEmoji] = useState(false)

  // use backend username fallback too
  const name = author?.username ?? message.username ?? `user ${message.user_id}`

  const grouped = (message.reactions ?? []).reduce<Record<string, number>>((acc, r: Reaction) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  async function submitEdit() {
    if (draft.trim() && draft !== message.content) {
      await onEdit(message.id, draft.trim())
    }
    setEditing(false)
  }

  return (
    <div className={`group relative flex px-4 py-2 ${isOwn ? 'justify-end' : 'justify-start'} hover:bg-ink/[0.03]`}>
      <div className={`flex max-w-[75%] gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <Avatar id={message.user_id} name={name} size={36} />

        <div className={`min-w-0 ${isOwn ? 'text-right' : 'text-left'}`}>
          <div className={`flex items-baseline gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {!isOwn && <span className="font-display text-sm font-bold">{name}</span>}
            <span className="font-mono text-[11px] text-ink-soft">
              {formatMessageTime(message.created_at)}
            </span>
            {message.is_pinned && (
              <span className="font-mono text-[10px] uppercase text-flag">pinned</span>
            )}
          </div>

          {editing ? (
            <div className={`mt-1 flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitEdit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="flex-1 border-2 border-ink bg-paper px-2 py-1 text-sm"
              />
              <button onClick={submitEdit} className="font-mono text-xs text-online">save</button>
              <button onClick={() => setEditing(false)} className="font-mono text-xs text-ink-soft">cancel</button>
            </div>
          ) : (
            <div
              className={`mt-1 inline-block max-w-full rounded border-2 px-3 py-2 text-sm shadow-hard-sm ${
                isOwn
                  ? 'border-accent bg-accent/20'
                  : 'border-ink bg-paper'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {Object.keys(grouped).length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(grouped).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="border-2 border-ink bg-paper px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent"
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}

          {(message.reply_count ?? 0) > 0 && (
            <button
              onClick={() => onOpenThread(message.id)}
              className="mt-1 font-mono text-[11px] text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* hover toolbar */}
      <div className="absolute right-3 top-0 hidden -translate-y-1/2 items-center gap-0.5 border-2 border-ink bg-paper shadow-hard-sm group-hover:flex">
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className="px-2 py-1 text-sm hover:bg-accent"
            title="React"
          >
            🙂
          </button>
          {showEmoji && (
            <div className="absolute right-0 top-full z-10 flex gap-1 border-2 border-ink bg-paper p-1 shadow-hard-sm">
              {QUICK_EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(message.id, e)
                    setShowEmoji(false)
                  }}
                  className="px-1 hover:bg-accent"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onOpenThread(message.id)}
          className="px-2 py-1 text-sm hover:bg-accent"
          title="Reply in thread"
        >
          💬
        </button>

        <button
          onClick={() => (message.is_pinned ? onUnpin(message.id) : onPin(message.id))}
          className="px-2 py-1 text-sm hover:bg-accent"
          title={message.is_pinned ? 'Unpin' : 'Pin'}
        >
          {message.is_pinned ? '📍' : '📌'}
        </button>

        {isOwn && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 text-sm hover:bg-accent"
              title="Edit"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="px-2 py-1 text-sm hover:bg-flag"
              title="Delete"
            >
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  )
}