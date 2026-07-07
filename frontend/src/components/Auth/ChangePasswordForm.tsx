import { useState } from 'react';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { changePassword } from '../../api/auth';

const { Text } = Typography;

export default function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: { old_password: string; new_password: string }) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await changePassword(values);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to change password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <KeyOutlined style={{ fontSize: 18, color: '#2563EB' }} />
        <Text strong style={{ fontSize: 15, color: '#1E293B' }}>
          Change Password
        </Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}
      {success && (
        <Alert
          message="Password changed successfully"
          type="success"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <Form onFinish={handleSubmit} layout="vertical" style={{ maxWidth: 400 }}>
        <Form.Item
          name="old_password"
          label="Current Password"
          rules={[{ required: true, message: 'Enter your current password' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Current password"
          />
        </Form.Item>

        <Form.Item
          name="new_password"
          label="New Password"
          rules={[
            { required: true, message: 'Enter a new password' },
            { min: 6, message: 'At least 6 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
            placeholder="New password"
          />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Confirm New Password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Confirm new password"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{
            height: 40,
            borderRadius: 8,
            fontWeight: 600,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Update Password
        </Button>
      </Form>
    </div>
  );
}
