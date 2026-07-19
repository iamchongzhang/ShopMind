import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as conversationsApi from '../../api/conversations';
import { askQuestionStream } from '../../api/qa';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import type { Message as MessageType } from '../../types/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

export default function ChatContainer() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? parseInt(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { isStreaming, streamingContent, pendingCitations, startStreaming, appendToken, setCitations, finishStreaming, setActiveConversation } = useChatStore();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load messages when conversation changes
  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationId ? conversationsApi.getConversation(conversationId) : null,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (convData?.messages) {
      setMessages((prev) => {
        // Don't replace local messages with fewer server messages —
        // the server may not have committed the latest messages yet
        if (convData.messages.length < prev.length) {
          return prev;
        }
        return convData.messages;
      });
    } else if (!conversationId) {
      setMessages([]);
    }
    setActiveConversation(conversationId);
  }, [convData, conversationId, setActiveConversation]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Cleanup: abort in-flight SSE stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(async (question: string) => {
    if (!token) {
      message.error('Please log in to send messages.');
      return;
    }

    // Stop button clicked — abort the in-flight SSE stream
    if (isStreaming) {
      abortRef.current?.abort();
      abortRef.current = null;
      finishStreaming();
      return;
    }

    setError(null);
    startStreaming();

    // Add user message immediately
    const userMsg: MessageType = {
      id: Date.now(),
      conversation_id: conversationId || 0,
      role: 'user',
      content: question,
      citations_json: null,
      token_count: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Abort any previous request (safety net — isStreaming guard should prevent this)
    abortRef.current?.abort();

    abortRef.current = askQuestionStream(
      question,
      conversationId,
      token,
      // onToken — feed each token to the chat store for real-time display
      (text) => {
        appendToken(text);
      },
      // onCitation — show source badges as they arrive
      (citations) => {
        setCitations(citations);
      },
      // onDone — build the final assistant message from accumulated state
      (messageId, convId) => {
        // Skip adding a message if messageId is 0 (backend couldn't save)
        if (messageId > 0) {
          const { streamingContent: content, pendingCitations: citations } = useChatStore.getState();
          const assistantMsg: MessageType = {
            id: messageId,
            conversation_id: convId,
            role: 'assistant',
            content,
            citations_json: citations.length > 0 ? JSON.stringify(citations) : null,
            token_count: null,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Refresh sidebar
        queryClient.invalidateQueries({ queryKey: ['conversations'] });

        // Navigate if this was a new conversation
        if (!conversationId && convId > 0) {
          navigate(`/chat/${convId}`, { replace: true });
        }

        // Sync with server to pick up the committed message
        if (messageId > 0) {
          const syncWithServer = async (retries = 2) => {
            for (let attempt = 0; attempt < retries; attempt++) {
              try {
                const convData = await conversationsApi.getConversation(convId);
                const hasMessage = convData.messages.some(
                  (m) => m.id === messageId
                );
                if (hasMessage || attempt === retries - 1) {
                  queryClient.setQueryData(
                    ['conversation', convId],
                    convData
                  );
                  setMessages(convData.messages);
                  return;
                }
                await new Promise((r) => setTimeout(r, 150));
              } catch {
                return;
              }
            }
          };
          syncWithServer();
        }
      },
      // onError — surface the error (cleanup happens in onComplete)
      (errMsg) => {
        setError(errMsg);
        message.error(errMsg);
      },
      // onComplete — ALWAYS called; the finally block for loading state
      () => {
        finishStreaming();
        abortRef.current = null;
      },
    );
  }, [token, isStreaming, conversationId, startStreaming, appendToken, setCitations, finishStreaming, queryClient, navigate]);

  // Build display messages
  const displayMessages = [...messages];
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: -1,
      conversation_id: conversationId || 0,
      role: 'assistant',
      content: streamingContent,
      citations_json: pendingCitations.length > 0 ? JSON.stringify(pendingCitations) : null,
      token_count: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
        <MessageList
          messages={displayMessages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          citations={pendingCitations}
          error={error}
        />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} isStreaming={isStreaming} disabled={!token} />
    </div>
  );
}
