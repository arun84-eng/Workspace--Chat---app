import { useEffect, useRef, useState } from 'react'
import { dmApi } from '../../api/dm'
import { usersApi, type UserStatusResponse } from '../../api/users'
import type { DirectMessage, User } from '../../types/api'
import { useInterval } from '../../hooks/useInterval'
import { Avatar } from '../ui/Avatar'
import { Composer } from './Composer'
import { formatDayLabel, formatMessageTime } from '../../lib/format'

function formatLastSeen(value?: string | null) {
  if (!value) return 'Offline'
  const d = new Date(value)
  return `Last seen ${d.toLocaleString()}`
}

export function DmView({
  otherUser,
  currentUser,
  onlineUserIds,
}: {
  otherUser: User
  currentUser: User
  onlineUserIds: Set<number>
}) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<UserStatusResponse | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const wasAtBottom = useRef(true)

  function checkAtBottom() {
    const el = scrollRef.current
    if (!el) return
    wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  function scrollToBottom() {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  async function loadStatus() {
    try {
      const res = await usersApi.status(otherUser.id)
      setStatus(res.data)
    } catch {
      // ignore
    }
  }

  async function markUnreadIncomingAsRead(list: DirectMessage[]) {
    const unreadIncoming = list.filter(
      (m) => m.receiver_id === currentUser.id && !m.read
    )

    if (!unreadIncoming.length) return

    await Promise.all(
      unreadIncoming.map((m) => dmApi.markRead(m.id).catch(() => null))
    )
    if (onDmUpdated) {
      await onDmUpdated()
    }
  }

  async function loadMessages() {
    try {
      const res = await dmApi.withUser(otherUser.id)
      const list = Array.isArray(res.data) ? res.data : []
      setMessages(list)

      await markUnreadIncomingAsRead(list)
    } catch {
      // keep previous state
    } finally {
      setLoading(false)
    }
  }

  async function loadAll() {
    await Promise.all([loadMessages(), loadStatus()])
  }

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setStatus(null)

    loadAll().then(() => {
      requestAnimationFrame(scrollToBottom)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUser.id])

  useEffect(() => {
    if (!loading && wasAtBottom.current) {
      requestAnimationFrame(scrollToBottom)
    }
  }, [messages, loading])

  useInterval(loadAll, 3000)

  async function handleSend(content: string) {
    await dmApi.send({ receiver_id: otherUser.id, content })
    await loadAll()
    scrollToBottom()
  }

  const isOnline = status?.is_online ?? onlineUserIds.has(otherUser.id)

  let lastDay = ''

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <Avatar
          id={otherUser.id}
          name={otherUser.username}
          size={32}
          online={isOnline}
        />

        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">{otherUser.username}</h2>
          <p className="font-mono text-[11px] text-ink-soft">
            {isOnline ? 'Online' : formatLastSeen(status?.last_seen)}
          </p>
        </div>
      </div>

      <div ref={scrollRef} onScroll={checkAtBottom} className="flex-1 overflow-y-auto py-2">
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-ink-soft">
            Loading messages…
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-soft">
            No messages yet with {otherUser.username}.
          </p>
        )}

        {messages.map((m) => {
          const day = formatDayLabel(m.created_at)
          const showDivider = day !== lastDay
          lastDay = day

          const mine = m.sender_id === currentUser.id

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="my-2 flex items-center gap-2 px-4">
                  <div className="h-px flex-1 bg-ink/15" />
                  <span className="font-mono text-[11px] text-ink-soft">{day}</span>
                  <div className="h-px flex-1 bg-ink/15" />
                </div>
              )}

              <div className={`flex gap-3 px-4 py-1 ${mine ? 'flex-row-reverse text-right' : ''}`}>
                <Avatar
                  id={m.sender_id}
                  name={mine ? currentUser.username : otherUser.username}
                  size={32}
                  online={mine ? true : isOnline}
                />

                <div className="max-w-[70%]">
                  <p
                    className={`inline-block whitespace-pre-wrap break-words border-2 border-ink px-3 py-1.5 text-sm ${
                      mine ? 'bg-accent' : 'bg-panel'
                    }`}
                  >
                    {m.content}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
                    {formatMessageTime(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Composer placeholder={`Message ${otherUser.username}`} onSend={handleSend} />
    </div>
  )
}