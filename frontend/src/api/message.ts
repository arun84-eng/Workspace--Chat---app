import { http } from '../lib/http'
import type { Message, Reaction } from '../types/api'

export const messageApi = {
  send: (data: { channel_id: number; content: string; parent_message_id?: number | null }) =>
    http.post<Message>('/message/send', data),

  list: (channelId: number) => http.get<Message[]>(`/messages/${channelId}`),

  edit: (messageId: number, data: { content: string }) =>
    http.put<Message>(`/message/${messageId}`, data),

  delete: (messageId: number) => http.delete(`/message/${messageId}`),

  pin: (messageId: number) => http.put(`/message/pin/${messageId}`),

  unpin: (messageId: number) => http.put(`/message/unpin/${messageId}`),

  // Query param is `q`, not `query` — confirmed from spec.
  search: (q: string) => http.get<Message[]>('/search/messages', { params: { q } }),

  // parent_message_id is a QUERY param here; the body is a full MessageCreate.
  

  // Different schema from message/reply: body is { parent_id, content }.
  threadReply: (data: { parent_id: number; content: string }) =>
    http.post<Message>('/thread/reply', data),

  // Confirmed real duplicate routes in openapi.json (separate operationIds,
  // same purpose): /thread/{id} and /message/thread/{id}.
  thread: (messageId: number) => http.get<Message[]>(`/thread/${messageId}`),
  threadAlt: (messageId: number) =>
    http.get<Message[]>(`/message/thread/${messageId}`),

  threadCount: (messageId: number) =>
    http.get<{ message_id: number; reply_count: number }>(
      `/message/${messageId}/thread-count`
    ),
}

export const reactionApi = {
  add: (data: { message_id: number; emoji: string }) =>
    http.post<Reaction>('/react/add', data),

  remove: (data: { message_id: number; emoji: string }) =>
    http.delete('/reaction/remove', { data }),

  list: (messageId: number) =>
    http.get<Record<string, number>>(`/reactions/${messageId}/`)
}
