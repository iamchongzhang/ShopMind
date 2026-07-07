import apiClient from './client';
import type { DocumentDetail, DocumentListResponse, UploadResponse } from '../types/knowledgeBase';

export async function listDocuments(page = 1, perPage = 20, status?: string, fileType?: string): Promise<DocumentListResponse> {
  const res = await apiClient.get<DocumentListResponse>('/kb/documents', {
    params: { page, per_page: perPage, status, file_type: fileType },
  });
  return res.data;
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const res = await apiClient.get<DocumentDetail>(`/kb/documents/${id}`);
  return res.data;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<UploadResponse>('/kb/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await apiClient.delete(`/kb/documents/${id}`);
}

export async function reprocessDocument(id: number): Promise<UploadResponse> {
  const res = await apiClient.put<UploadResponse>(`/kb/documents/${id}/reprocess`);
  return res.data;
}
