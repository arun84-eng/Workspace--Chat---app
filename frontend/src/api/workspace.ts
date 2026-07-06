import { http } from '../lib/http'
import type { Channel, Workspace, WorkspaceMember } from '../types/api'

export const workspaceApi = {
  list: () => http.get<Workspace[]>('/workspaces'),

  create: (data: { name: string }) => http.post<Workspace>('/workspace/create', data),

  rename: (data: { workspace_id: number; name: string }) =>
    http.put<Workspace>('/workspace/rename', data),

  delete: (data: { workspace_id: number }) =>
    http.delete('/workspace/delete', { data }),

  leave: (data: { workspace_id: number }) =>
    http.delete('/workspace/leave', { data }),

  channels: (workspaceId: number) =>
    http.get<Channel[]>(`/workspace/${workspaceId}/channels`),

  members: (workspaceId: number) =>
    http.get<WorkspaceMember[]>(`/workspace/${workspaceId}/members`),

  addMember: (data: { workspace_id: number; user_id: number }) =>
    http.post('/workspace/add-member', data),

  removeMember: (data: { workspace_id: number; user_id: number }) =>
    http.delete('/workspace/remove-member', { data }),

  promoteAdmin: (data: { workspace_id: number; user_id: number }) =>
    http.put('/workspace/promote-admin', data),

  demoteAdmin: (data: { workspace_id: number; user_id: number }) =>
    http.put('/workspace/demote-admin', data),
}
