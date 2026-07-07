import { useNavigate, useParams } from 'react-router-dom';
import { List, Typography, Popconfirm, message, Spin } from 'antd';
import { DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as conversationsApi from '../../api/conversations';

const { Text } = Typography;

interface Props {
  collapsed: boolean;
}

export default function ConversationList({ collapsed }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeId = id ? parseInt(id) : null;

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.listConversations(),
  });

  const deleteMutation = useMutation({
    mutationFn: conversationsApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      message.success('Conversation deleted');
    },
  });

  const handleDelete = async (convId: number) => {
    await deleteMutation.mutateAsync(convId);
    if (activeId === convId) {
      navigate('/chat');
    }
  };

  if (collapsed) return null;

  const items = data?.items || [];

  return (
    <div style={{ flex: 1, overflow: 'auto', maxHeight: 'calc(100vh - 200px)', padding: '0 4px' }}>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
          <MessageOutlined style={{ fontSize: 24, color: '#CBD5E1', marginBottom: 8 }} />
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              No conversations yet
            </Text>
          </div>
        </div>
      ) : (
        <List
          dataSource={items}
          split={false}
          renderItem={(item) => {
            const isActive = activeId === item.id;
            return (
              <div
                role="button"
                tabIndex={0}
                aria-label={`Open conversation: ${item.title}`}
                aria-current={isActive ? 'page' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/chat/${item.id}`);
                  }
                }}
                onClick={() => navigate(`/chat/${item.id}`)}
                style={{
                  padding: '10px 12px',
                  margin: '2px 0',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <MessageOutlined
                  style={{
                    color: isActive ? '#2563EB' : '#94A3B8',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    ellipsis
                    style={{
                      fontSize: 13,
                      color: isActive ? '#1E293B' : '#334155',
                      fontWeight: isActive ? 600 : 400,
                      display: 'block',
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.updated_at && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(item.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  )}
                </div>
                <Popconfirm
                  title="Delete this conversation?"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(item.id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okButtonProps={{ danger: true }}
                >
                  <DeleteOutlined
                    style={{
                      color: '#CBD5E1',
                      fontSize: 12,
                      opacity: 0,
                      transition: 'opacity 0.15s ease, color 0.15s ease',
                      flexShrink: 0,
                    }}
                    className="delete-icon"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Delete conversation: ${item.title}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.id);
                      }
                    }}
                  />
                </Popconfirm>
              </div>
            );
          }}
        />
      )}

      {/* CSS-in-JS hover effect for delete icon */}
      <style>{`
        .cursor-pointer:hover .delete-icon,
        div[style*="cursor: pointer"]:hover .delete-icon {
          opacity: 1 !important;
          color: #DC2626 !important;
        }
      `}</style>
    </div>
  );
}
