export function TopBar({
  onSearch,
  onNotifications,
  notifCount,
}: {
  onSearch: () => void
  onNotifications: () => void
  notifCount: number
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-end gap-2 border-b-2 border-ink bg-paper px-4">
      <button
        onClick={onSearch}
        className="flex items-center gap-1.5 border-2 border-ink px-3 py-1 font-mono text-xs hover:bg-accent"
      >
        ⌕ Search
      </button>
      <button
        onClick={onNotifications}
        className="relative flex items-center gap-1.5 border-2 border-ink px-3 py-1 font-mono text-xs hover:bg-accent"
      >
        🔔
        {notifCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center border-2 border-ink bg-flag font-mono text-[9px] text-paper">
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </button>
    </div>
  )
}
