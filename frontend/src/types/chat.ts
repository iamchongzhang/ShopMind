export interface Citation {
  source: string;
  chunk: number;
  text: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations_json: string | null;
  token_count: number | null;
  created_at: string | null;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  per_page: number;
}
