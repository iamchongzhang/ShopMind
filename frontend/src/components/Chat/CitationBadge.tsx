import { Tag, Popover, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { Citation } from '../../types/chat';

const { Text, Paragraph } = Typography;

interface Props {
  citation: Citation;
  index: number;
}

export default function CitationBadge({ citation, index }: Props) {
  const content = (
    <div style={{ maxWidth: 360 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FileTextOutlined style={{ color: '#2563EB', fontSize: 16 }} />
        <Text strong style={{ fontSize: 13 }}>{citation.source}</Text>
      </div>
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: 6,
          padding: '6px 10px',
          marginBottom: 8,
          display: 'inline-block',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Chunk #{citation.chunk}
        </Text>
      </div>
      {citation.text && (
        <Paragraph
          type="secondary"
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            padding: 10,
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #F1F5F9',
            margin: 0,
          }}
          ellipsis={{ rows: 6, expandable: true, symbol: 'more' }}
        >
          {citation.text}
        </Paragraph>
      )}
    </div>
  );

  return (
    <Popover content={content} title={`Source ${index + 1}`} trigger="click">
      <Tag
        color="blue"
        style={{
          cursor: 'pointer',
          borderRadius: 6,
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 500,
          transition: 'all 0.15s ease',
        }}
      >
        [{index + 1}] {citation.source.length > 24 ? citation.source.slice(0, 24) + '…' : citation.source}
      </Tag>
    </Popover>
  );
}
