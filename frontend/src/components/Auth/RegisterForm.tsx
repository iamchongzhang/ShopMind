import { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Card } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (values: { username: string; password: string; email?: string }) => {
    setLoading(true);
    setError(null);
    try {
      await register(values.username, values.password, values.email);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 440,
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        }}
        bodyStyle={{ padding: 40 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 26 }}>
            ShopMind
          </Title>
        </div>

        <Title level={4} style={{ textAlign: 'center', marginBottom: 28, fontWeight: 500, color: '#475569' }}>
          Create your account
        </Title>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form onFinish={handleSubmit} size="large" layout="vertical">
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers, and underscores only' },
              { min: 3, message: 'At least 3 characters' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="Choose a username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="Email (optional)" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'At least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Create a password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Confirm your password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: 46,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Already have an account?{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
