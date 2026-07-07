import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as conversationsApi from '../../api/conversations';
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

  // Load messages when conversation changes
  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationId ? conversationsApi.getConversation(conversationId) : null,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (convData?.messages) {
      setMessages(convData.messages);
    } else if (!conversationId) {
      setMessages([]);
    }
    setActiveConversation(conversationId);
  }, [convData, conversationId, setActiveConversation]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async (question: string) => {
    if (!token) {
      message.error('Please log in to send messages.');
      return;
    }
    if (isStreaming) {
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

    // Call sync Q&A endpoint (reliable, no SSE proxy issues)
    try {
      const response = await fetch('/api/qa/ask-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question, conversation_id: conversationId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
      }

      const data = await response.json();
      finishStreaming();

      const convId: number = data.conversation_id;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', convId] });

      if (!conversationId) {
        navigate(`/chat/${convId}`, { replace: true });
      } else {
        const convData = await conversationsApi.getConversation(convId).catch(() => null);
        if (convData) {
          setMessages(convData.messages);
        } else {
          setError('Failed to load conversation.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
      finishStreaming();
    }
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
