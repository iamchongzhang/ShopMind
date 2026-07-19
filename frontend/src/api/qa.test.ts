import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askQuestionStream } from './qa';
import type { Citation } from '../types/chat';

// ── Types ────────────────────────────────────────────────────

interface SSETokenEvent {
  type: 'token';
  content: string;
}

interface SSECitationEvent {
  type: 'citation';
  sources: Citation[];
}

interface SSEDoneEvent {
  type: 'done';
  message_id: number;
  conversation_id: number;
}

interface SSEErrorEvent {
  type: 'error';
  content: string;
}

type SSEEvent = SSETokenEvent | SSECitationEvent | SSEDoneEvent | SSEErrorEvent;

interface SSEFetchOptions {
  /** Split each serialized line into byte chunks of this size (simulates TCP fragmentation). */
  chunkSize?: number;
  /** Return an HTTP error response instead of a stream. */
  httpStatus?: number;
  /** Error detail for non-200 responses. */
  httpDetail?: string;
  /** Enqueue this many chunks, then pause forever (simulates a slow upstream for abort tests). */
  pauseAfterChunks?: number;
}

// ── Mock infrastructure ──────────────────────────────────────

/**
 * Build a mock `fetch` that returns a Response with a ReadableStream of
 * SSE JSON-line events.
 *
 * Each event object is serialized as ``JSON.stringify(evt) + "\\n"``,
 * matching the backend's transport format.  Strings in the event array
 * are treated as raw SSE lines (used to inject malformed data).
 *
 * `options.chunkSize` splits the payload into fixed-size byte chunks so
 * the client's buffer-accumulation logic is exercised.
 *
 * Abort behaviour: the stream registers an `abort` listener on the
 * `AbortSignal` extracted from the request init.  When `abort()` fires,
 * the listener calls `controller.error()`, which causes `reader.read()`
 * to reject with a `DOMException` named `"AbortError"`.
 *
 * `options.pauseAfterChunks` stops enqueuing after N chunks but keeps
 * the stream open — used to test abort mid-stream.
 */
function createSSEFetch(
  events: Array<SSEEvent | string>,
  options: SSEFetchOptions = {},
): typeof fetch {
  return (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal as AbortSignal | undefined;

    // ── HTTP error path (no stream body) ──
    if (options.httpStatus && options.httpStatus !== 200) {
      return Promise.resolve(
        new Response(JSON.stringify({ detail: options.httpDetail || 'Request failed' }), {
          status: options.httpStatus,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    const encoder = new TextEncoder();

    // ── Serialize events to byte chunks ──
    let chunks: Uint8Array[];
    if (options.chunkSize != null && options.chunkSize > 0) {
      // Concatenate all lines, then split into fixed-size byte chunks
      const allLines = events
        .map((e) => (typeof e === 'string' ? e : JSON.stringify(e) + '\n'))
        .join('');
      const allBytes = encoder.encode(allLines);
      chunks = [];
      for (let i = 0; i < allBytes.length; i += options.chunkSize) {
        chunks.push(allBytes.slice(i, i + options.chunkSize));
      }
    } else {
      // One chunk per event line
      chunks = events.map((e) =>
        typeof e === 'string' ? encoder.encode(e) : encoder.encode(JSON.stringify(e) + '\n'),
      );
    }

    const pauseAfter = options.pauseAfterChunks ?? chunks.length;
    let chunkIndex = 0;

    const stream = new ReadableStream({
      start(controller) {
        if (signal) {
          signal.addEventListener('abort', () => {
            try {
              // Error the stream, which causes any pending reader.read() to
              // reject with AbortError — matching real browser behaviour.
              controller.error(new DOMException('The operation was aborted.', 'AbortError'));
            } catch {
              // Controller may already be closed or errored
            }
          });
        }
      },
      async pull(controller) {
        if (signal?.aborted) {
          try {
            controller.error(new DOMException('The operation was aborted.', 'AbortError'));
          } catch {
            // Already errored
          }
          return;
        }

        // Enqueue available chunks up to the pause point
        while (chunkIndex < pauseAfter) {
          controller.enqueue(chunks[chunkIndex++]);
        }

        // All chunks delivered — close the stream
        if (chunkIndex >= chunks.length) {
          controller.close();
          return;
        }

        // Paused: chunks remain but we're simulating a stalled upstream
        // (e.g. LLM generating slowly).  Suspend via a never-resolving
        // promise.  The abort signal listener will error the controller
        // to release the reader when abort() is called.
        await new Promise<never>(() => {
          // Never resolves — stream stays open until aborted.
        });
      },
    });

    return Promise.resolve(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
  };
}

// ── Convenience helpers for building event arrays ─────────────

const token = (content: string): SSEEvent => ({ type: 'token', content });
const citation = (sources: Citation[]): SSEEvent => ({ type: 'citation', sources });
const done = (message_id: number, conversation_id: number): SSEEvent => ({
  type: 'done',
  message_id,
  conversation_id,
});
const error = (content: string): SSEEvent => ({ type: 'error', content });

// ── Callback collector ────────────────────────────────────────

interface CallbackLog {
  tokens: string[];
  citationCalls: Citation[][];
  doneCall: { messageId: number; conversationId: number } | null;
  errorCalls: string[];
  completeCount: number;
}

/** Wire up all callbacks and return the abort controller + a log that
 *  records every invocation for assertions. */
function collectCallbacks() {
  const log: CallbackLog = {
    tokens: [],
    citationCalls: [],
    doneCall: null,
    errorCalls: [],
    completeCount: 0,
  };

  const onToken = (text: string) => log.tokens.push(text);
  const onCitationFn = (citations: Citation[]) => log.citationCalls.push(citations);
  const onDone = (messageId: number, conversationId: number) => {
    log.doneCall = { messageId, conversationId };
  };
  const onError = (errMsg: string) => log.errorCalls.push(errMsg);
  const onComplete = () => log.completeCount++;

  return { log, onToken, onCitationFn, onDone, onError, onComplete };
}

// ── Tests ─────────────────────────────────────────────────────

describe('askQuestionStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Normal token delivery ─────────────────────────────

  it('delivers multiple tokens in order via onToken', async () => {
    const mockFetch = createSSEFetch([
      token('Hello'),
      token(' world'),
      done(1, 5),
    ]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    // Wait for the stream to be fully consumed (all async processing done)
    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.tokens).toEqual(['Hello', ' world']);
    expect(log.doneCall).toEqual({ messageId: 1, conversationId: 5 });
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 2. Fragmentation: line split across chunks ────────────

  it('reassembles a JSON line split across network chunks', async () => {
    // chunkSize=7 bytes forces each ~30-byte line into 4-5 chunks.
    // The buffer must accumulate partial lines until a \n arrives.
    const mockFetch = createSSEFetch(
      [token('Hello World'), done(1, 1)],
      { chunkSize: 7 },
    );
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    // onToken must be called exactly once with the fully-reassembled content
    expect(log.tokens).toEqual(['Hello World']);
    // The done event must also survive fragmentation
    expect(log.doneCall).toEqual({ messageId: 1, conversationId: 1 });
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 3. Multiple events in a single chunk ──────────────────

  it('handles multiple complete events arriving in a single chunk', async () => {
    const mockFetch = createSSEFetch(
      [token('A'), token('B'), done(1, 1)],
      { chunkSize: 9999 },
    );
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    // All 3 lines arrive in one reader.read() call; buffer.split('\n')
    // must yield 3 distinct lines
    expect(log.tokens).toEqual(['A', 'B']);
    expect(log.doneCall).toEqual({ messageId: 1, conversationId: 1 });
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 4. onDone then onComplete, no spurious error ──────────

  it('calls onDone then onComplete, without spurious connection-lost error', async () => {
    const mockFetch = createSSEFetch([token('Hi'), done(2, 3)]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.tokens).toEqual(['Hi']);
    expect(log.doneCall).toEqual({ messageId: 2, conversationId: 3 });
    // streamEndedNormally=true → no spurious connection-lost error
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 5. Server error event ─────────────────────────────────

  it('calls onError and onComplete when the server sends an error event', async () => {
    // In production, the backend sends error (content_filter fallback)
    // followed by done. Model both events to avoid a spurious
    // connection-lost error from the finally block.
    const mockFetch = createSSEFetch([error('Content filtered'), done(1, 5)]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.errorCalls).toEqual(['Content filtered']);
    expect(log.doneCall).toEqual({ messageId: 1, conversationId: 5 });
    expect(log.completeCount).toBe(1);
  });

  // ── 6. Content-filtered: backend returns message_id=0 ─────

  it('passes through backend message_id=0 without treating it as an error', async () => {
    // When the backend's content_filter guard fires, it saves no
    // assistant message and yields done with message_id=0.  The SSE
    // client must forward this; ChatContainer's onDone handler
    // checks messageId > 0 to skip adding an empty bubble.
    const mockFetch = createSSEFetch([done(0, 5)]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.doneCall).toEqual({ messageId: 0, conversationId: 5 });
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 7. Connection loss ────────────────────────────────────

  it('surfaces connection loss as error and calls onComplete', async () => {
    // Stream has a token event but closes WITHOUT a 'done' event
    const mockFetch = createSSEFetch([token('partial')]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.tokens).toEqual(['partial']);
    expect(log.doneCall).toBeNull();
    expect(log.errorCalls).toEqual(['Connection lost before response completed.']);
    expect(log.completeCount).toBe(1);
  });

  // ── 8. Abort mid-stream ───────────────────────────────────

  it('aborts via AbortSignal without misleading connection-lost error, onComplete still fires', async () => {
    // pauseAfterChunks=1: the stream yields one token chunk then
    // suspends forever.  We abort while reader.read() is waiting.
    const mockFetch = createSSEFetch(
      [token('slow'), done(1, 1)],
      { pauseAfterChunks: 1 },
    );
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    const controller = askQuestionStream(
      'test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete,
    );

    // Wait for the first token to arrive
    await vi.waitFor(() => { expect(log.tokens.length).toBe(1); }, { timeout: 2000 });
    expect(log.tokens).toEqual(['slow']);

    // Now abort while the stream is suspended (reader.read() is pending)
    controller.abort();

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    // Abort is intentional — no error callbacks should fire
    expect(log.errorCalls).toEqual([]);
    expect(log.doneCall).toBeNull();
    expect(log.completeCount).toBe(1);
  });

  // ── 9. Malformed JSON ─────────────────────────────────────

  it('skips unparseable SSE lines and guarantees onComplete in finally', async () => {
    // Raw string injected directly into the stream — NOT valid JSON.
    // The parser must log a warning and continue to the next line.
    const mockFetch = createSSEFetch([
      '{not valid}\n',                     // raw malformed line
      token('ok'),                         // valid event after garbage
    ]);
    vi.stubGlobal('fetch', mockFetch);

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    // Malformed line logged, but processing continues
    expect(consoleWarn).toHaveBeenCalledWith(
      '[SSE] Skipped unparseable line:',
      expect.stringContaining('{not valid}'),
    );
    // The valid token after it must still arrive
    expect(log.tokens).toEqual(['ok']);
    // Stream closed without done → connection-lost error
    expect(log.errorCalls).toEqual(['Connection lost before response completed.']);
    // finally block always runs
    expect(log.completeCount).toBe(1);

    consoleWarn.mockRestore();
  });

  // ── 10. Citation delivery ─────────────────────────────────

  it('passes citation sources to onCitation callback', async () => {
    const sampleCitations: Citation[] = [
      { source: 'products.pdf', chunk: 3, text: '2-year warranty on all items.' },
    ];
    const mockFetch = createSSEFetch([citation(sampleCitations), done(1, 1)]);
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.citationCalls).toHaveLength(1);
    expect(log.citationCalls[0]).toEqual(sampleCitations);
    expect(log.doneCall).toEqual({ messageId: 1, conversationId: 1 });
    expect(log.errorCalls).toEqual([]);
    expect(log.completeCount).toBe(1);
  });

  // ── 11. HTTP error response ───────────────────────────────

  it('calls onError and onComplete when the server returns a non-200 status', async () => {
    const mockFetch = createSSEFetch([], {
      httpStatus: 500,
      httpDetail: 'Internal server error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const { log, onToken, onCitationFn, onDone, onError, onComplete } =
      collectCallbacks();

    askQuestionStream('test', 1, 'tok', onToken, onCitationFn, onDone, onError, onComplete);

    await vi.waitFor(() => { expect(log.completeCount).toBe(1); }, { timeout: 2000 });

    expect(log.errorCalls).toEqual(['Internal server error']);
    expect(log.tokens).toEqual([]);
    expect(log.doneCall).toBeNull();
    expect(log.completeCount).toBe(1);
  });
});
