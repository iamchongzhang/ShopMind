import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { Citation, Message } from '../../types/chat';
import MarkdownRenderer from './MarkdownRenderer';
import CitationBadge from './CitationBadge';

const { Text } = Typography;

interface Props {
  message: Message;
  isStreaming: boolean;
  citations: Citation[];
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  // Parse citations from the message
  let msgCitations: Citation[] = [];
  if (message.citations_json) {
    try {
      msgCitations = JSON.parse(message.citations_json);
    } catch { /* ignore */ }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <Avatar
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        size={34}
        style={{
          backgroundColor: isUser ? '#475569' : '#2563EB',
          flexShrink: 0,
          boxShadow: isUser
            ? '0 2px 6px rgba(71,85,105,0.2)'
            : '0 2px 8px rgba(37,99,235,0.2)',
        }}
      />

      {/* Bubble */}
      <div
        style={{
          maxWidth: '72%',
          padding: '14px 18px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? '#EFF6FF' : '#FFFFFF',
          border: isUser ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {isUser ? (
          <Text style={{ fontSize: 14, lineHeight: 1.6, color: '#1E293B' }}>
            {message.content}
          </Text>
        ) : (
          <div>
            <MarkdownRenderer content={message.content} />
            {isStreaming && (
              <span className="cursor-blink" style={{ fontSize: 16 }}>▌</span>
            )}
            {msgCitations.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: 10,
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sources
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {msgCitations.map((c, i) => (
                    <CitationBadge key={i} citation={c} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
