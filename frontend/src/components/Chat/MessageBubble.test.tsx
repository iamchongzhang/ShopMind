import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';
import type { Message } from '../../types/chat';

describe('MessageBubble', () => {
  const userMessage: Message = {
    id: 1,
    conversation_id: 1,
    role: 'user',
    content: 'What size should I get?',
    citations_json: null,
    token_count: null,
    created_at: '2025-01-01',
  };

  const assistantMessage: Message = {
    id: 2,
    conversation_id: 1,
    role: 'assistant',
    content: 'Based on your height and weight, a medium would fit best.',
    citations_json: JSON.stringify([
      { source: 'size-chart.pdf', chunk: 2, text: 'Size M fits 170-180 cm' },
    ]),
    token_count: 12,
    created_at: '2025-01-01',
  };

  const assistantWithoutCitations: Message = {
    id: 3,
    conversation_id: 1,
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    citations_json: null,
    token_count: 7,
    created_at: '2025-01-01',
  };

  it('renders user message content', () => {
    render(<MessageBubble message={userMessage} isStreaming={false} citations={[]} />);
    expect(screen.getByText('What size should I get?')).toBeInTheDocument();
  });

  it('renders assistant message content via MarkdownRenderer', () => {
    render(<MessageBubble message={assistantMessage} isStreaming={false} citations={[]} />);
    expect(screen.getByText(/Based on your height/)).toBeInTheDocument();
  });

  it('shows a blinking cursor when isStreaming is true for an assistant message', () => {
    render(<MessageBubble message={assistantWithoutCitations} isStreaming={true} citations={[]} />);
    // The cursor is rendered as a span with class "cursor-blink"
    const cursor = document.querySelector('.cursor-blink');
    expect(cursor).toBeInTheDocument();
    expect(cursor!.textContent).toBe('▌');
  });

  it('does not show the cursor when isStreaming is false', () => {
    render(<MessageBubble message={assistantWithoutCitations} isStreaming={false} citations={[]} />);
    expect(document.querySelector('.cursor-blink')).not.toBeInTheDocument();
  });

  it('does not show the cursor for user messages even when streaming', () => {
    render(<MessageBubble message={userMessage} isStreaming={true} citations={[]} />);
    expect(document.querySelector('.cursor-blink')).not.toBeInTheDocument();
  });

  it('parses and displays citations from citations_json', () => {
    render(<MessageBubble message={assistantMessage} isStreaming={false} citations={[]} />);
    // The "Sources" label is visible
    expect(screen.getByText('Sources')).toBeInTheDocument();
    // The citation badge shows the source filename
    expect(screen.getByText(/\[1\]/)).toBeInTheDocument();
    expect(screen.getByText(/size-chart.pdf/)).toBeInTheDocument();
  });

  it('handles malformed citations_json without crashing', () => {
    const badMessage: Message = {
      ...assistantMessage,
      citations_json: '{not valid json',
    };
    render(<MessageBubble message={badMessage} isStreaming={false} citations={[]} />);
    // Should still render the content, just without citations section
    expect(screen.getByText(/Based on your height/)).toBeInTheDocument();
    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });

  it('does not show Sources section when there are no citations', () => {
    render(<MessageBubble message={assistantWithoutCitations} isStreaming={false} citations={[]} />);
    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });
});
