import { create } from 'zustand';
import type { Citation } from '../types/chat';

interface ChatState {
  activeConversationId: number | null;
  isStreaming: boolean;
  streamingContent: string;
  pendingCitations: Citation[];
  setActiveConversation: (id: number | null) => void;
  startStreaming: () => void;
  appendToken: (token: string) => void;
  setCitations: (citations: Citation[]) => void;
  finishStreaming: () => void;
  resetStream: () => void;
  resetAll: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  isStreaming: false,
  streamingContent: '',
  pendingCitations: [],

  setActiveConversation: (id) => set({ activeConversationId: id }),

  /** Fully reset all chat state for "New Chat" */
  resetAll: () =>
    set({
      activeConversationId: null,
      isStreaming: false,
      streamingContent: '',
      pendingCitations: [],
    }),

  startStreaming: () =>
    set({ isStreaming: true, streamingContent: '', pendingCitations: [] }),

  appendToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),

  setCitations: (citations) => set({ pendingCitations: citations }),

  finishStreaming: () => set({ isStreaming: false }),

  resetStream: () =>
    set({ isStreaming: false, streamingContent: '', pendingCitations: [] }),
}));
