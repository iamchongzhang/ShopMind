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
  onComplete: () => void,
): AbortController {
  const controller = new AbortController();
  let streamEndedNormally = false;

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
      let streamCompleteFired = false;

      const finalComplete = () => {
        if (!streamCompleteFired) {
          streamCompleteFired = true;
          onComplete();
        }
      };

      try {
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

        let aborted = false;
        try {
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
                    streamEndedNormally = true;
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
        } catch (err) {
          // reader.read() rejects with AbortError when the stream is
          // aborted via AbortController — this is intentional, not a
          // connection loss. Suppress the error so the .catch() handler
          // (which also ignores AbortError) doesn't double-fire.
          if (err instanceof DOMException && err.name === 'AbortError') {
            aborted = true;
          }
          // Don't rethrow: errors inside the reader loop are handled here.
          // Network-level errors (fetch itself) still flow to .catch().
        } finally {
          // If the stream closed without a 'done' or 'error' event,
          // the connection was lost — surface this to the user.
          if (!streamEndedNormally && !aborted) {
            onError('Connection lost before response completed.');
          }
          finalComplete();
        }
      } finally {
        // Outer finally: guarantee onComplete fires for ALL paths,
        // including early returns (HTTP errors, missing reader).
        // finalComplete() is idempotent — if the inner finally already
        // called it, this is a no-op.
        finalComplete();
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Connection error');
      }
      onComplete();
    });

  return controller;
}
