// PetGPT API layer — mirrors the latest backend contract on origin/main
// (frontend integration guide §22 of petGPT.md / petgpt-backend phases 2–7).
//
// Endpoints:
//   POST   /api/ai/conversations                create / start new conversation
//   GET    /api/ai/conversations                list the user's conversations
//   GET    /api/ai/conversations/:id            conversation + messages
//   POST   /api/ai/conversations/:id/messages   enqueue a durable generation (202)
//   DELETE /api/ai/conversations/:id            clear conversation (hard delete)
//   GET    /api/ai/jobs/:id                     durable generation job status
//
// Ownership is always backend-derived from the JWT; the client never sends
// ownership ids. Nothing here invents endpoints, fields, or polling behavior
// beyond what origin/main exposes.

import { apiDelete, apiGet, apiPost } from './client'

export type PetGPTRole = 'user' | 'assistant' | 'system'

export interface PetGPTToolCall {
  name: string
  arguments?: Record<string, unknown>
  ok: boolean
  error?: string
}

export interface PetGPTMessage {
  id: string
  role: PetGPTRole
  content: string
  createdAt: string
  toolCalls?: PetGPTToolCall[]
}

export interface PetGPTConversation {
  id: string
  title: string
  lastMessageAt: string | null
  lastMessagePreview: string
  createdAt: string
  updatedAt: string
}

export type PetGPTJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface PetGPTJobError {
  code: string
  message: string
}

export interface PetGPTJob {
  id: string
  status: PetGPTJobStatus
  provider: string | null
  model: string | null
  attemptCount: number
  conversationId: string
  userMessageId: string
  assistantMessageId: string | null
  error: PetGPTJobError | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
}

export interface CreateConversationResult {
  success: boolean
  conversation: PetGPTConversation
}

export interface ListConversationsResult {
  success: boolean
  conversations: PetGPTConversation[]
}

export interface GetConversationResult {
  success: boolean
  conversation: PetGPTConversation
  messages: PetGPTMessage[]
}

// POST /messages: three distinct success shapes — durable 202 (in-scope),
// synchronous scope answer (out-of-scope), and an idempotent reuse.
interface AcceptedMessageResult {
  success: true
  conversationId: string
  userMessage: PetGPTMessage
  job: PetGPTJob
}
interface ScopeHandledResult {
  success: true
  scopeHandled: true
  conversationId: string
  userMessage: PetGPTMessage
  assistantMessage: PetGPTMessage
}
interface ReusedMessageResult {
  success: true
  reused: true
  conversationId: string
  userMessage: PetGPTMessage
  job: PetGPTJob
}
export type AddMessageResult = AcceptedMessageResult | ScopeHandledResult | ReusedMessageResult

export interface GetJobResult {
  success: boolean
  job: PetGPTJob
  userMessage: PetGPTMessage
  assistantMessage: PetGPTMessage | null
}

export function createConversation(title?: string): Promise<CreateConversationResult> {
  return apiPost<CreateConversationResult>('/ai/conversations', title ? { title } : undefined)
}

export function listConversations(): Promise<ListConversationsResult> {
  return apiGet<ListConversationsResult>('/ai/conversations')
}

export function getConversation(conversationId: string): Promise<GetConversationResult> {
  return apiGet<GetConversationResult>(`/ai/conversations/${conversationId}`)
}

export function addMessage(
  conversationId: string,
  content: string,
  idempotencyKey: string,
): Promise<AddMessageResult> {
  return apiPost<AddMessageResult>(`/ai/conversations/${conversationId}/messages`, {
    content,
    idempotencyKey,
  })
}

export function deleteConversation(conversationId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/ai/conversations/${conversationId}`)
}

export function getJobStatus(jobId: string): Promise<GetJobResult> {
  return apiGet<GetJobResult>(`/ai/jobs/${jobId}`)
}

// Unique per logical submission so an accidental re-send reuses the same job
// instead of duplicating a turn (backend scopes (owner, key) -> one job).
export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}