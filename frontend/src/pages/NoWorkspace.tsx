import { Button } from '../components/ui/Button'

export default function NoWorkspace({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-paper px-4">
      <div className="border-2 border-ink bg-panel p-8 text-center shadow-hard">
        <p className="mb-1 text-4xl">💬</p>
        <h2 className="mb-2 font-display text-xl font-bold">No workspace selected</h2>
        <p className="mb-5 max-w-xs text-sm text-ink-soft">
          Create a workspace to get started, or ask someone to invite you to theirs.
        </p>
        <Button onClick={onCreate}>Create a workspace</Button>
      </div>
    </div>
  )
}
