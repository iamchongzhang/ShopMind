import type { Citation } from '../types/chat';

const BASE = '/api';

export function askQuestionStream(
  question: string,
  conversationId: number | null,
  token: string,
  onToken: (text: string) => void,
  onCitation: (citations: Citation[]) => void,
  onDone: (messageId: number, conversationId: number) => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE}/qa/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, conversation_id: conversationId }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Request failed' }));
        onError(err.detail || 'Request failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response stream');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            switch (event.type) {
              case 'token':
                onToken(event.content);
                break;
              case 'citation':
                onCitation(event.sources);
                break;
              case 'done':
                onDone(event.message_id, event.conversation_id);
                break;
              case 'error':
                onError(event.content);
                break;
            }
          } catch {
            console.warn('[SSE] Skipped unparseable line:', line.substring(0, 100));
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Connection error');
      }
    });

  return controller;
}
