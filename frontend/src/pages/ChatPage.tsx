import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  authApi,
  channelApi,
  dmApi,
  notificationsApi,
  usersApi,
  workspaceApi,
} from '../api'
import { useAuthStore } from '../store/authStore'
import { useInterval } from '../hooks/useInterval'
import type { Channel, User, Workspace } from '../types/api'

import { WorkspaceRail } from '../components/layout/WorkspaceRail'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'
import { ChannelView } from '../components/chat/ChannelView'
import { DmView } from '../components/chat/DmView'
import { SearchPanel } from '../components/chat/SearchPanel'
import { NotificationsPanel } from '../components/chat/NotificationsPanel'
import NoWorkspace from './NoWorkspace'

type RightPanel = 'search' | 'notifications' | null
type ActiveView =
  | { kind: 'channel'; id: number }
  | { kind: 'dm'; userId: number }
  | null

export default function ChatPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  // ── workspaces ──────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null

  // ── channels ────────────────────────────────────────────────────────
  const [channels, setChannels] = useState<Channel[]>([])

  // ── users / presence ────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())
  const usersById = useMemo(
    () => new Map(allUsers.map((u) => [u.id, u])),
    [allUsers]
  )

  // ── DM conversations (list of people we've messaged) ─────────────────
  const [dmSidebarItems, setDmSidebarItems] = useState<DmSidebarItem[]>([])
  const dmUsers = dmSidebarItems.map((item) => item.user)

  // ── unread counts ────────────────────────────────────────────────────
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [dmUnreadMap, setDmUnreadMap] = useState<Record<number, number>>({})

  // ── active view / panels ─────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ActiveView>(null)
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)

  const activeChannel = activeView?.kind === 'channel'
    ? channels.find((c) => c.id === activeView.id) ?? null
    : null
  const activeDmUser = activeView?.kind === 'dm'
    ? usersById.get(activeView.userId) ?? null
    : null

  // ── data loading ─────────────────────────────────────────────────────
  async function loadWorkspaces() {
    try {
      const res = await workspaceApi.list()
      const list = Array.isArray(res.data) ? (res.data as Workspace[]) : []
      setWorkspaces(list)
      if (list.length > 0 && activeWorkspaceId === null) {
        setActiveWorkspaceId(list[0].id)
      }
    } catch {/* network down — keep what we have */}
  }

  async function loadChannels(workspaceId: number) {
    try {
      const res = await workspaceApi.channels(workspaceId)
      const list = Array.isArray(res.data) ? (res.data as Channel[]) : []
      setChannels(list)
    } catch {
      setChannels([])
    }
  }

  async function loadUsers() {
    try {
      const res = await usersApi.list()
      setAllUsers(Array.isArray(res.data) ? (res.data as User[]) : [])
    } catch {/* noop */}
  }

  async function loadOnline() {
    try {
      const res = await usersApi.online()
      const list = Array.isArray(res.data) ? (res.data as User[]) : []
      setOnlineUserIds(new Set(list.map((u) => u.id)))
    } catch {/* noop */}
  }

  async function loadDmConversations() {
    try {
      const res = await dmApi.conversations()
      const list = Array.isArray(res.data) ? (res.data as User[]) : []

      // keep only user ids from backend conversation users
      const ids = list.map((u) => u.id)

      setDmPartnerIds([...new Set(ids)])

      // also merge any users we got here into allUsers so DM view can always resolve them
      setAllUsers((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]))
        for (const u of list) {
          map.set(u.id, u)
        }
        return Array.from(map.values())
      })
    } catch {
      // noop
    }
  }

  async function loadUnreadCounts() {
    try {
      const [dmRes, notifRes] = await Promise.allSettled([
        dmApi.unreadCount(),
        notificationsApi.unreadCount(),
      ])

      if (dmRes.status === 'fulfilled') {
        const list = Array.isArray(dmRes.value.data) ? dmRes.value.data : []
        const map: Record<number, number> = {}
        let total = 0

        for (const item of list as Array<{ user_id: number; unread_count: number }>) {
          map[item.user_id] = item.unread_count
          total += item.unread_count
        }

        setDmUnreadMap(map)
        setUnreadDmCount(total)
      }

      if (notifRes.status === 'fulfilled') {
        const d = notifRes.value.data as Record<string, unknown>
        setUnreadNotifCount(Number(d.unread_count ?? d.count ?? 0))
      }
    } catch {
      // noop
    }
  }

  // initial load
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    loadWorkspaces()
    loadUsers()
    loadOnline()
    loadDmConversations()
    loadUnreadCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // reload channels when workspace changes
  useEffect(() => {
    if (activeWorkspaceId !== null) {
      setActiveView(null)
      setChannels([])
      loadChannels(activeWorkspaceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId])

  // polling for presence + unread counts
  useInterval(loadOnline, 15_000)
  useInterval(loadUnreadCounts, 8_000)
  useInterval(loadDmConversations, 15_000)

  // ── actions ──────────────────────────────────────────────────────────
  async function handleCreateWorkspace(name: string) {
    const res = await workspaceApi.create({ name })
    const ws = res.data as Workspace
    setWorkspaces((prev) => [...prev, ws])
    setActiveWorkspaceId(ws.id)
  }

  async function handleCreateChannel(name: string) {
    if (!activeWorkspaceId) return
    const res = await channelApi.create({ workspace_id: activeWorkspaceId, name })
    const ch = res.data as Channel
    setChannels((prev) => [...prev, ch])
    setActiveView({ kind: 'channel', id: ch.id })
  }

  function handleSelectDm(userId: number) {
    setDmPartnerIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    )
    setActiveView({ kind: 'dm', userId })
    setRightPanel(null)
  }

  const handleSearchJump = useCallback(
    (channelId: number) => {
      setActiveView({ kind: 'channel', id: channelId })
      setRightPanel(null)
    },
    []
  )

  async function handleLogout() {
    try { await authApi.logout() } catch {/* ignore */}
    clearSession()
    navigate('/login', { replace: true })
  }

  function togglePanel(p: RightPanel) {
    setRightPanel((prev) => (prev === p ? null : p))
  }

  // ── guard ─────────────────────────────────────────────────────────────
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-paper font-body">
      {/* workspace rail */}
      <WorkspaceRail
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        onSelect={(id) => setActiveWorkspaceId(id)}
        onCreate={handleCreateWorkspace}
      />

      {/* sidebar */}
      <Sidebar
        workspaceName={activeWorkspace?.name ?? '—'}
        channels={channels}
        dmUsers={dmUsers}
        allUsers={allUsers}
        onlineUserIds={onlineUserIds}
        activeView={
          activeView?.kind === 'channel'
            ? { kind: 'channel', id: activeView.id }
            : activeView?.kind === 'dm'
            ? { kind: 'dm', id: activeView.userId }
            : null
        }
        onSelectChannel={(id) => {
          setActiveView({ kind: 'channel', id })
          setRightPanel(null)
        }}
        onSelectDm={handleSelectDm}
        onCreateChannel={handleCreateChannel}
        currentUser={user}
        onLogout={handleLogout}
        unreadDmCount={unreadDmCount}
        unreadNotifCount={unreadNotifCount}
        dmUnreadMap={dmUnreadMap}
      />

      {/* main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          onSearch={() => togglePanel('search')}
          onNotifications={() => togglePanel('notifications')}
          notifCount={unreadNotifCount}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* main content */}
          {activeWorkspaceId === null ? (
            <NoWorkspace onCreate={() => { /* trigger rail create */ }} />
          ) : activeChannel ? (
            <ChannelView
              key={activeChannel.id}
              channel={activeChannel}
              currentUser={user}
              usersById={usersById}
            />
          ) : activeDmUser ? (
            <DmView
              key={activeDmUser.id}
              otherUser={activeDmUser}
              currentUser={user}
              onlineUserIds={onlineUserIds}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="border-2 border-ink bg-panel px-8 py-10 shadow-hard">
                <p className="mb-2 text-4xl">
                  {channels.length > 0 ? '👈' : '✦'}
                </p>
                <h2 className="font-display text-xl font-bold">
                  {channels.length > 0
                    ? 'Pick a channel'
                    : activeWorkspace?.name}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {channels.length > 0
                    ? 'Select a channel from the sidebar to start messaging.'
                    : 'Create a channel using the + next to Channels.'}
                </p>
              </div>
            </div>
          )}

          {/* right panels */}
          {rightPanel === 'search' && (
            <SearchPanel
              onClose={() => setRightPanel(null)}
              onJumpToMessage={handleSearchJump}
            />
          )}
          {rightPanel === 'notifications' && (
            <NotificationsPanel onClose={() => setRightPanel(null)} />
          )}
        </div>
      </div>
    </div>
  )
}
