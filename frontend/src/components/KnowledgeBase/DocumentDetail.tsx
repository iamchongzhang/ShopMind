import { Drawer, Descriptions, List, Tag, Spin, Typography, Space } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDocument } from '../../api/knowledgeBase';

const { Text } = Typography;

interface Props {
  documentId: number | null;
  onClose: () => void;
}

export default function DocumentDetailDrawer({ documentId, onClose }: Props) {
  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => (documentId ? getDocument(documentId) : null),
    enabled: !!documentId,
  });

  const statusColor = doc?.status === 'completed' ? 'success' : doc?.status === 'failed' ? 'error' : 'processing';

  return (
    <Drawer
      title={
        <Space>
          <FileOutlined style={{ color: '#2563EB' }} />
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
            {doc?.filename || 'Document Details'}
          </span>
        </Space>
      }
      open={!!documentId}
      onClose={onClose}
      width={600}
      styles={{ body: { background: '#F8FAFC' } }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : doc ? (
        <>
          <Descriptions
            column={1}
            size="small"
            bordered
            style={{ marginBottom: 24, background: '#FFFFFF', borderRadius: 10 }}
          >
            <Descriptions.Item label="Status">
              <Tag color={statusColor}>{doc.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: 11 }}>
                {doc.file_type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Size">
              {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Chunks">{doc.chunk_count}</Descriptions.Item>
            <Descriptions.Item label="Uploaded">
              {doc.created_at ? new Date(doc.created_at).toLocaleString() : '—'}
            </Descriptions.Item>
            {doc.error_message && (
              <Descriptions.Item label={<span style={{ color: '#DC2626' }}>Error</span>}>
                <Text type="danger">{doc.error_message}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 15, margin: 0 }}>
              Chunk Previews
            </h3>
            {doc.chunk_total > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Showing {doc.chunks?.length || 0} of {doc.chunk_total} chunks
              </Text>
            )}
          </div>
          <List
            dataSource={doc.chunks || []}
            renderItem={(chunk) => (
              <List.Item
                style={{
                  background: '#FFFFFF',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 8,
                  border: '1px solid #F1F5F9',
                }}
              >
                <List.Item.Meta
                  title={
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>
                      Chunk {chunk.chunk_index}
                    </Text>
                  }
                  description={
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, lineHeight: 1.6 }}
                      ellipsis
                    >
                      {chunk.content_preview}
                    </Text>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No chunks available yet' }}
          />
        </>
      ) : null}
    </Drawer>
  );
}
