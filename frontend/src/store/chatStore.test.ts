import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChatStore.getState().resetAll();
  });

  describe('initial state', () => {
    it('has isStreaming=false, empty content, and empty citations', () => {
      const state = useChatStore.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.streamingContent).toBe('');
      expect(state.pendingCitations).toEqual([]);
    });

    it('has activeConversationId=null', () => {
      expect(useChatStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('startStreaming', () => {
    it('sets isStreaming to true', () => {
      useChatStore.getState().startStreaming();
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it('clears previous streaming content and citations', () => {
      // Simulate a prior stream
      useChatStore.setState({
        streamingContent: 'leftover',
        pendingCitations: [{ source: 'x.pdf', chunk: 0, text: 'x' }],
      });
      useChatStore.getState().startStreaming();
      expect(useChatStore.getState().streamingContent).toBe('');
      expect(useChatStore.getState().pendingCitations).toEqual([]);
    });
  });

  describe('appendToken', () => {
    it('appends each token to streamingContent', () => {
      const store = useChatStore.getState();
      store.startStreaming();
      store.appendToken('Hello');
      store.appendToken(' ');
      store.appendToken('world');
      expect(useChatStore.getState().streamingContent).toBe('Hello world');
    });

    it('handles empty string as a no-op', () => {
      useChatStore.getState().startStreaming();
      useChatStore.getState().appendToken('');
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('handles multiple consecutive calls building up content', () => {
      useChatStore.getState().startStreaming();
      for (const char of 'streaming') {
        useChatStore.getState().appendToken(char);
      }
      expect(useChatStore.getState().streamingContent).toBe('streaming');
    });
  });

  describe('setCitations', () => {
    it('replaces pendingCitations with the provided array', () => {
      const citations = [{ source: 'products.pdf', chunk: 0, text: '2-year warranty' }];
      useChatStore.getState().setCitations(citations);
      expect(useChatStore.getState().pendingCitations).toEqual(citations);
    });

    it('replaces previous citations on subsequent calls', () => {
      useChatStore.getState().setCitations([{ source: 'a.pdf', chunk: 0, text: 'a' }]);
      useChatStore.getState().setCitations([{ source: 'b.pdf', chunk: 1, text: 'b' }]);
      expect(useChatStore.getState().pendingCitations).toHaveLength(1);
      expect(useChatStore.getState().pendingCitations[0].source).toBe('b.pdf');
    });
  });

  describe('finishStreaming', () => {
    it('sets isStreaming to false', () => {
      useChatStore.getState().startStreaming();
      useChatStore.getState().finishStreaming();
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it('preserves streamingContent and citations after finishing', () => {
      useChatStore.getState().startStreaming();
      useChatStore.getState().appendToken('cached content');
      useChatStore.getState().setCitations([{ source: 'x.pdf', chunk: 0, text: 'x' }]);
      useChatStore.getState().finishStreaming();
      expect(useChatStore.getState().streamingContent).toBe('cached content');
      expect(useChatStore.getState().pendingCitations).toHaveLength(1);
    });
  });

  describe('resetStream', () => {
    it('clears isStreaming, content, and citations together', () => {
      useChatStore.getState().startStreaming();
      useChatStore.getState().appendToken('partial');
      useChatStore.getState().setCitations([{ source: 'x.pdf', chunk: 0, text: 'x' }]);
      useChatStore.getState().resetStream();

      const s = useChatStore.getState();
      expect(s.isStreaming).toBe(false);
      expect(s.streamingContent).toBe('');
      expect(s.pendingCitations).toEqual([]);
    });
  });

  describe('resetAll', () => {
    it('clears everything including activeConversationId', () => {
      useChatStore.setState({
        activeConversationId: 42,
        isStreaming: true,
        streamingContent: 'stuff',
        pendingCitations: [{ source: 'x.pdf', chunk: 0, text: 'x' }],
      });
      useChatStore.getState().resetAll();

      const s = useChatStore.getState();
      expect(s.activeConversationId).toBeNull();
      expect(s.isStreaming).toBe(false);
      expect(s.streamingContent).toBe('');
      expect(s.pendingCitations).toEqual([]);
    });
  });

  describe('setActiveConversation', () => {
    it('updates activeConversationId', () => {
      useChatStore.getState().setActiveConversation(99);
      expect(useChatStore.getState().activeConversationId).toBe(99);
    });

    it('allows setting back to null', () => {
      useChatStore.getState().setActiveConversation(99);
      useChatStore.getState().setActiveConversation(null);
      expect(useChatStore.getState().activeConversationId).toBeNull();
    });
  });
});
