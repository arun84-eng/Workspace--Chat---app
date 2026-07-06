import { type KeyboardEvent, useRef, useState } from 'react'
import { Button } from '../ui/Button'

export function Composer({
  placeholder,
  onSend,
  onTyping,
}: {
  placeholder: string
  onSend: (content: string) => Promise<void>
  onTyping?: (isTyping: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(v: string) {
    setValue(v)
    if (!onTyping) return
    onTyping(true)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => onTyping(false), 2000)
  }

  async function handleSend() {
    const content = value.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await onSend(content)
      setValue('')
      onTyping?.(false)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t-2 border-ink bg-paper p-3">
      <div className="flex items-end gap-2 border-2 border-ink bg-paper p-2 focus-within:ring-2 focus-within:ring-accent">
        <textarea
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-32 flex-1 resize-none bg-transparent text-sm focus:outline-none"
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !value.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
