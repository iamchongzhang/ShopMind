import { Typography, Descriptions, Tag, Card } from 'antd';
import { UserOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import ChangePasswordForm from '../components/Auth/ChangePasswordForm';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
          }}
        >
          <UserOutlined style={{ fontSize: 22, color: '#fff' }} />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Poppins, sans-serif' }}>
            Profile
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage your account settings
          </Text>
        </div>
      </div>

      {/* Account Info Card */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <SafetyOutlined style={{ fontSize: 18, color: '#2563EB' }} />
          <Text strong style={{ fontSize: 15, color: '#1E293B' }}>
            Account Information
          </Text>
        </div>
        {user && (
          <Descriptions column={1} bordered={false} size="middle" colon={false}>
            <Descriptions.Item
              label={<Text type="secondary">Username</Text>}
            >
              <Text strong>{user.username}</Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={<Text type="secondary">Role</Text>}
            >
              <Tag
                color={user.role === 'admin' ? 'blue' : 'default'}
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                {user.role === 'admin' ? 'Administrator' : 'Member'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={<Text type="secondary">Email</Text>}
            >
              <Text>{user.email || '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item
              label={<Text type="secondary">Member since</Text>}
            >
              <Text>
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {/* Change Password Card */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        styles={{ body: { padding: 24 } }}
      >
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
