import apiClient from './client';
import type { Conversation, ConversationDetail, ConversationListResponse } from '../types/chat';

export async function listConversations(page = 1, perPage = 50): Promise<ConversationListResponse> {
  const res = await apiClient.get<ConversationListResponse>('/conversations', {
    params: { page, per_page: perPage },
  });
  return res.data;
}

export async function createConversation(title = 'New Conversation'): Promise<Conversation> {
  const res = await apiClient.post<Conversation>('/conversations', { title });
  return res.data;
}

export async function getConversation(id: number): Promise<ConversationDetail> {
  const res = await apiClient.get<ConversationDetail>(`/conversations/${id}`);
  return res.data;
}

export async function updateConversation(id: number, title: string): Promise<Conversation> {
  const res = await apiClient.put<Conversation>(`/conversations/${id}`, { title });
  return res.data;
}

export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/conversations/${id}`);
}
