import { useEffect, useRef, useState } from 'react'
import { channelApi, messageApi, reactionApi, usersApi } from '../../api'
import type { Channel, Message, User } from '../../types/api'
import { useInterval } from '../../hooks/useInterval'
import { MessageItem } from './MessageItem'
import { Composer } from './Composer'
import { PinnedBar } from './PinnedBar'
import { ThreadPanel } from './ThreadPanel'
import { formatDayLabel } from '../../lib/format'

export function ChannelView({
  channel,
  currentUser,
  usersById,
}: {
  channel: Channel
  currentUser: User
  usersById: Map<number, User>
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<{ user_id: number; username?: string }[]>([])
  const [pinnedKey, setPinnedKey] = useState(0)
  const [threadMessageId, setThreadMessageId] = useState<number | null>(null)
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

  async function loadMessages() {
    try {
      const res = await messageApi.list(channel.id)
      const data = Array.isArray(res.data) ? res.data : []
      setMessages(data)
    } catch {
      // keep old messages if refresh fails
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setMessages([])
    loadMessages().then(scrollToBottom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id])

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        if (wasAtBottom.current) scrollToBottom()
      })
    }
  }, [messages, loading])

  useInterval(loadMessages, 3000)

  useInterval(() => {
    channelApi
      .typingUsers(channel.id)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setTypingUsers(list.filter((t) => t.user_id !== currentUser.id))
      })
      .catch(() => {})
  }, 2500)

  async function handleSend(content: string) {
    await messageApi.send({ channel_id: channel.id, content })
    await loadMessages()
    scrollToBottom()
  }

  async function handleEdit(id: number, content: string) {
    await messageApi.edit(id, { content })
    await loadMessages()
  }

  async function handleDelete(id: number) {
    await messageApi.delete(id)
    await loadMessages()
  }

  async function handlePin(id: number) {
    await messageApi.pin(id)
    await loadMessages()
    setPinnedKey((k) => k + 1)
  }

  async function handleUnpin(id: number) {
    await messageApi.unpin(id)
    await loadMessages()
    setPinnedKey((k) => k + 1)
  }

  async function handleReact(id: number, emoji: string) {
    const target = messages.find((m) => m.id === id)
    const mine = target?.reactions?.find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji
    )

    if (mine) {
      await reactionApi.remove({ message_id: id, emoji })
    } else {
      await reactionApi.add({ message_id: id, emoji })
    }

    await loadMessages()
  }

  let lastDay = ''

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b-2 border-ink px-4 py-3">
        <span className="font-mono text-lg text-ink-soft">#</span>
        <h2 className="font-display text-lg font-bold">{channel.name}</h2>
      </div>

      <PinnedBar channelId={channel.id} refreshKey={pinnedKey} />

      <div ref={scrollRef} onScroll={checkAtBottom} className="flex-1 overflow-y-auto py-2">
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-ink-soft">
            Loading messages…
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-soft">
            No messages yet — say something to get the conversation started.
          </p>
        )}

        {messages.map((m) => {
          const day = formatDayLabel(m.created_at)
          const showDivider = day !== lastDay
          lastDay = day

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="my-2 flex items-center gap-2 px-4">
                  <div className="h-px flex-1 bg-ink/15" />
                  <span className="font-mono text-[11px] text-ink-soft">{day}</span>
                  <div className="h-px flex-1 bg-ink/15" />
                </div>
              )}

              <MessageItem
                message={m}
                author={usersById.get(m.user_id)}
                isOwn={m.user_id === currentUser.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onUnpin={handleUnpin}
                onReact={handleReact}
                onOpenThread={setThreadMessageId}
              />
            </div>
          )
        })}
      </div>

      {typingUsers.length > 0 && (
        <p className="px-4 py-1 font-mono text-[11px] text-ink-soft">
          {typingUsers
            .map(
              (t) =>
                usersById.get(t.user_id)?.username ??
                t.username ??
                `user ${t.user_id}`
            )
            .join(', ')}{' '}
          {typingUsers.length === 1 ? 'is' : 'are'} typing…
        </p>
      )}

      <Composer
        placeholder={`Message #${channel.name}`}
        onSend={handleSend}
        onTyping={(isTyping) => {
          usersApi
            .setTyping({ channel_id: channel.id, is_typing: isTyping })
            .catch(() => {})
        }}
      />

      {threadMessageId !== null && (
        <ThreadPanel
          messageId={threadMessageId}
          channelId={channel.id}
          currentUser={currentUser}
          usersById={usersById}
          onClose={() => setThreadMessageId(null)}
          onChanged={loadMessages}
        />
      )}
    </div>
  )
}