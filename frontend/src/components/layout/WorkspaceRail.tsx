import { useState } from 'react'
import type { Workspace } from '../../types/api'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export function WorkspaceRail({
  workspaces,
  activeId,
  onSelect,
  onCreate,
}: {
  workspaces: Workspace[]
  activeId: number | null
  onSelect: (id: number) => void
  onCreate: (name: string) => Promise<void>
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onCreate(name.trim())
      setName('')
      setShowCreate(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-r-2 border-ink bg-ink py-3">
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => onSelect(ws.id)}
          title={ws.name}
          className={`flex h-11 w-11 items-center justify-center border-2 font-display text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            activeId === ws.id
              ? 'border-accent bg-accent text-ink shadow-hard-sm'
              : 'border-paper bg-ink text-paper hover:bg-panel hover:text-ink'
          }`}
        >
          {ws.name.slice(0, 2).toUpperCase()}
        </button>
      ))}

      <button
        onClick={() => setShowCreate(true)}
        title="Create workspace"
        className="flex h-11 w-11 items-center justify-center border-2 border-dashed border-paper text-paper hover:border-accent hover:text-accent"
      >
        +
      </button>

      {showCreate && (
        <Modal title="Create workspace" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button className="w-full" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create workspace'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
