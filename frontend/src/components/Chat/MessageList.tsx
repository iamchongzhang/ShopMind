import { MessageOutlined } from '@ant-design/icons';
import type { Citation, Message } from '../../types/chat';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  citations: Citation[];
  error: string | null;
}

export default function MessageList({ messages, isLoading, isStreaming, citations, error }: Props) {
  if (isLoading) {
    return (
      <div style={{ padding: '0 16px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, maxWidth: i === 2 ? '60%' : '75%' }}>
              <div className="skeleton" style={{ height: 16, marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 4, borderRadius: 4 }} />
              {i === 1 && <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 4 }} />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <MessageOutlined style={{ fontSize: 32, color: '#2563EB' }} />
        </div>
        <h3 style={{ marginBottom: 8, color: '#1E293B' }}>Start a Conversation</h3>
        <p style={{ color: '#64748B', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
          Ask about product specs, pricing, shipping, returns, or any product detail. ShopMind searches the catalog and provides cited answers.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }}>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStreaming={msg.id === -1 && isStreaming}
          citations={citations}
        />
      ))}
      {error && (
        <div
          style={{
            color: '#DC2626',
            padding: '12px 16px',
            textAlign: 'center',
            background: '#FEF2F2',
            borderRadius: 10,
            border: '1px solid #FECACA',
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
