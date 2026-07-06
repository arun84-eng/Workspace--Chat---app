import { http } from '../lib/http'
import type { Channel, FileAttachment, Message, TypingUser, User } from '../types/api'

export const channelApi = {
  create: (data: { workspace_id: number; name: string }) =>
    http.post<Channel>('/channel/create', data),

  rename: (data: { channel_id: number; name: string }) =>
    http.put<Channel>('/channel/rename', data),

  delete: (data: { channel_id: number }) =>
    http.delete('/channel/delete', { data }),

  // Confirmed real duplicate in openapi.json: this and
  // workspaceApi.channels() are two separate routes returning the same
  // data (different operationIds, identical purpose). Both kept.
  listForWorkspace: (workspaceId: number) =>
    http.get<Channel[]>(`/channels/${workspaceId}`),

  addMember: (data: { channel_id: number; user_id: number }) =>
    http.post('/channel/add-member', data),

  members: (channelId: number) =>
    http.get<User[]>(`/channel/${channelId}/members`),

  typingUsers: (channelId: number) =>
    http.get<TypingUser[]>(`/channel/${channelId}/typing`),

  pinnedMessages: (channelId: number) =>
    http.get<Message[]>(`/channel/${channelId}/pinned`),

  files: (channelId: number) =>
    http.get<FileAttachment[]>(`/channel/${channelId}/files`),

  // channel_id is a query param on this backend, NOT a form field.
  uploadFile: (channelId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<FileAttachment>('/channel/upload', form, {
      params: { channel_id: channelId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
