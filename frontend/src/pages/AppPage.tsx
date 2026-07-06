import { useCallback, useEffect, useState } from 'react'
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
import type { Channel, User, Workspace } from '../types/api'
import { useInterval } from '../hooks/useInterval'
import { WorkspaceRail } from '../components/layout/WorkspaceRail'
import { Sidebar } from '../components/layout/Sidebar'
import { ChannelView } from '../components/chat/ChannelView'
import { DmView } from '../components/chat/DmView'

type ActiveView =
  | { kind: 'channel'; id: number }
  | { kind: 'dm'; userId: number }
  | null

type DmSidebarItem = {
  user: User
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}  
export default function AppPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWsId, setActiveWsId] = useState<number | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set())
  const [unreadDm, setUnreadDm] = useState(0)
  const [unreadNotif, setUnreadNotif] = useState(0)
  const [dmUsers, setDmUsers] = useState<User[]>([])
  const [activeView, setActiveView] = useState<ActiveView>(null)
  const [dmUnreadMap, setDmUnreadMap] = useState<Record<number, number>>({})

  const usersById = new Map(allUsers.map((u) => [u.id, u]))

  // ── workspaces ──────────────────────────────────────────────────────────
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await workspaceApi.list()
      const data = Array.isArray(res.data) ? res.data : []
      setWorkspaces(data)
      if (data.length > 0 && !activeWsId) {
        setActiveWsId(data[0].id)
      }
    } catch {
      // network hiccup — leave current list
    }
  }, [activeWsId])

  useEffect(() => { loadWorkspaces() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── channels for active workspace ────────────────────────────────────────
  const loadChannels = useCallback(async () => {
    if (!activeWsId) return
    try {
      const res = await workspaceApi.channels(activeWsId)
      const data = Array.isArray(res.data) ? res.data : []
      setChannels(data)
      // auto-select first channel if nothing is selected yet
      if (data.length > 0 && activeView === null) {
        setActiveView({ kind: 'channel', id: data[0].id })
      }
    } catch {
      setChannels([])
    }
  }, [activeWsId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setChannels([])
    setActiveView(null)
    loadChannels()
  }, [activeWsId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── users + presence ─────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const [allRes, onlineRes] = await Promise.all([
        usersApi.list(),
        usersApi.online(),
      ])
      const all = Array.isArray(allRes.data) ? allRes.data : []
      const online = Array.isArray(onlineRes.data) ? onlineRes.data : []
      setAllUsers(all)
      setOnlineIds(new Set(online.map((u: User) => u.id)))
    } catch {
      // keep previous values
    }
  }, [])

  useEffect(() => { loadUsers() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useInterval(loadUsers, 15_000)

  // ── DM conversations sidebar ──────────────────────────────────────────────
  const loadDmSidebar = useCallback(async () => {
    try {
      const [convRes, countRes] = await Promise.all([
        dmApi.conversations(),
        dmApi.unreadCount(),
      ])

      const convData = Array.isArray(convRes.data) ? convRes.data : []
      const otherIds = new Set<number>()
      const unreadMap: Record<number, number> = {}

      if (currentUser) {
        ;(convData as unknown[]).forEach((item) => {
          const r = item as Record<string, unknown>

          const sid = r.sender_id as number | undefined
          const rid = r.receiver_id as number | undefined
          const id = r.id as number | undefined

          let otherUserId: number | undefined

          // if API returns DM/message-shaped objects
          if (sid && rid) {
            otherUserId = sid === currentUser.id ? rid : sid
          } else if (id && id !== currentUser.id) {
            // if API returns user-shaped objects
            otherUserId = id
          }

          if (!otherUserId || otherUserId === currentUser.id) return

          otherIds.add(otherUserId)

          // try to read per-conversation unread count if backend includes it
          const unread =
            (r.unread_count as number | undefined) ??
            (r.unreadCount as number | undefined) ??
            0

          unreadMap[otherUserId] = unread
        })
      }

      const others = allUsers.filter((u) => otherIds.has(u.id))
      setDmUsers(others)
      setDmUnreadMap(unreadMap)

      const countData = countRes.data as Record<string, unknown>
      setUnreadDm((countData?.count as number) ?? 0)
    } catch {
      // keep previous values
    }
  }, [allUsers, currentUser])

    // ── actions ───────────────────────────────────────────────────────────────
  async function handleCreateWorkspace(name: string) {
    await workspaceApi.create({ name })
    await loadWorkspaces()
  }

  async function handleCreateChannel(name: string) {
    if (!activeWsId) return
    await channelApi.create({ workspace_id: activeWsId, name })
    await loadChannels()
  }

  async function handleLogout() {
    try { await authApi.logout() } catch { /* ignore — clear locally either way */ }
    clearSession()
    navigate('/login', { replace: true })
  }

  function handleSelectWorkspace(id: number) {
    setActiveWsId(id)
    setActiveView(null)
  }

  // ── guards ────────────────────────────────────────────────────────────────
  if (!currentUser) {
    navigate('/login', { replace: true })
    return null
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWsId)
  const activeChannel =
    activeView?.kind === 'channel'
      ? channels.find((c) => c.id === activeView.id) ?? null
      : null
  const activeDmUser =
    activeView?.kind === 'dm'
      ? allUsers.find((u) => u.id === activeView.userId) ?? null
      : null

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <WorkspaceRail
        workspaces={workspaces}
        activeId={activeWsId}
        onSelect={handleSelectWorkspace}
        onCreate={handleCreateWorkspace}
      />

      <Sidebar
        workspaceName={activeWorkspace?.name ?? 'Select a workspace'}
        channels={channels}
        dmUsers={dmUsers}
        onlineUserIds={onlineIds}
        activeView={
          activeView?.kind === 'channel'
            ? { kind: 'channel', id: activeView.id }
            : activeView?.kind === 'dm'
            ? { kind: 'dm', id: activeView.userId }
            : null
        }
        onSelectChannel={(id) => setActiveView({ kind: 'channel', id })}
        onSelectDm={(userId) => setActiveView({ kind: 'dm', userId })}
        onCreateChannel={handleCreateChannel}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadDmCount={unreadDm}
        unreadNotifCount={unreadNotif}
      />

      <main className="flex min-w-0 flex-1 overflow-hidden">
        {activeChannel && (
          <ChannelView
            key={activeChannel.id}
            channel={activeChannel}
            currentUser={currentUser}
            usersById={usersById}
          />
        )}

        {activeDmUser && (
          <DmView
            key={activeDmUser.id}
            otherUser={activeDmUser}
            currentUser={currentUser}
            onlineUserIds={onlineIds}
          />
        )}

        {!activeChannel && !activeDmUser && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            {workspaces.length === 0 ? (
              <>
                <p className="font-display text-xl font-bold">No workspaces yet</p>
                <p className="text-sm text-ink-soft">Click + in the left rail to create one.</p>
              </>
            ) : channels.length === 0 ? (
              <>
                <p className="font-display text-xl font-bold">No channels</p>
                <p className="text-sm text-ink-soft">Click # in the sidebar to create a channel.</p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Select a channel or DM to start.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
