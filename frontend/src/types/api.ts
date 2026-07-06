
export interface AuthResponse {
  message: string
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  message: string
  user_id: number
}

export type User = {
  id: number
  username: string
  email: string
  is_online?: boolean
  last_seen?: string | null
}

export interface Workspace {
  id: number
  name: string
  owner_id: number
}

export interface Channel {
  id: number
  name: string
  workspace_id: number
}

export interface Reaction {
  emoji: string
  user_id: number
  message_id: number
}

export interface Message {
  id: number
  content: string
  created_at: string
  user_id: number
  username?: string | null
  channel_id: number
  parent_message_id?: number | null
  is_pinned?: boolean
  reply_count?: number
  reactions?: Reaction[]
}

export interface DirectMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
  read?: boolean
}

export interface FileAttachment {
  id: number
  filename: string
  uploaded_by?: number
  created_at?: string
}

export interface NotificationItem {
  id: number
  text: string
  is_read: boolean
  created_at: string
}

export interface TypingUser {
  user_id: number
  username: string
}

/* ---------- extra response types for backend endpoints ---------- */

export interface UserStatusResponse {
  user_id: number
  username: string
  is_online: boolean
  last_seen: string | null
}

export interface DmConversationUser {
  id: number
  username: string
  email: string
}

export interface DmUnreadCountItem {
  user_id: number
  unread_count: number
}

export interface ThreadCountResponse {
  message_id: number
  reply_count: number
}

export type ReactionSummary = Record<string, number>