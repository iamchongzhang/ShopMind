export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number | null;
  chunk_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  uploaded_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChunkPreview {
  chunk_index: number;
  content_preview: string;
  metadata: Record<string, unknown>;
}

export interface DocumentDetail extends Document {
  chunks: ChunkPreview[];
  chunk_total: number;
}

export interface UploadResponse {
  id: number;
  filename: string;
  status: string;
  message: string;
}
