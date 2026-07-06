import { useState } from 'react'
import { messageApi } from '../../api'
import type { Message } from '../../types/api'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { formatMessageTime } from '../../lib/format'

export function SearchPanel({
  onClose,
  onJumpToMessage,
}: {
  onClose: () => void
  onJumpToMessage: (channelId: number) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!q.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const res = await messageApi.search(q.trim())
      setResults(Array.isArray(res.data) ? res.data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l-2 border-ink bg-paper">
      <div className="flex items-center justify-between border-b-2 border-ink px-3 py-3">
        <h3 className="font-display text-sm font-bold">Search messages</h3>
        <button onClick={onClose} className="border-2 border-ink px-2 text-sm hover:bg-accent">
          ✕
        </button>
      </div>

      <div className="flex gap-2 border-b-2 border-ink p-3">
        <Input
          autoFocus
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button size="sm" onClick={handleSearch} disabled={loading}>
          Go
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-3 py-4 text-center text-xs text-ink-soft">Searching…</p>}
        {!loading && searched && results.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-ink-soft">No results for "{q}"</p>
        )}
        {results.map((m: Message) => (
          <button
            key={m.id}
            onClick={() => m.channel_id && onJumpToMessage(m.channel_id)}
            className="flex w-full flex-col gap-1 border-b border-ink/10 px-3 py-2.5 text-left hover:bg-panel"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-ink-soft">#{m.channel_id}</span>
              <span className="font-mono text-[10px] text-ink-soft">·</span>
              <span className="font-mono text-[10px] text-ink-soft">{formatMessageTime(m.created_at)}</span>
            </div>
            <p className="line-clamp-2 text-xs">{m.content}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
