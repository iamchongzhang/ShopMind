import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Typography, Avatar, Dropdown } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import ConversationList from './ConversationList';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const handleNewChat = () => {
    // Reset the chat store
    import('../../store/chatStore').then((m) => m.useChatStore.getState().resetAll());
    // If already on /chat, force remount by navigating with a timestamp key
    if (location.pathname === '/chat') {
      navigate(`/chat?new=${Date.now()}`, { replace: true });
    } else {
      navigate('/chat');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: () => navigate('/profile'),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Sign Out',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          boxShadow: '1px 0 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: collapsed ? '16px 12px' : '20px 16px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
          >
            <ThunderboltOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: '#1E293B', lineHeight: 1.2 }}>
                ShopMind
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                AI-Powered Product Q&A
              </Text>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div style={{ padding: collapsed ? '8px' : '12px 16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block={!collapsed}
            onClick={handleNewChat}
            aria-label="Start new chat"
            style={{
              borderRadius: 10,
              fontWeight: 600,
              height: collapsed ? 40 : 40,
              fontSize: collapsed ? 16 : 14,
              boxShadow: collapsed ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
            }}
          >
            {collapsed ? '' : 'New Chat'}
          </Button>
        </div>

        {/* Product Library — prominent nav item for admins */}
        {isAdmin && (
          <div style={{ padding: collapsed ? '4px 8px' : '8px 16px' }}>
            <Button
              type="default"
              icon={<BookOutlined />}
              block={!collapsed}
              onClick={() => navigate('/admin/knowledge-base')}
              aria-label="Open Product Library"
              style={{
                borderRadius: 10,
                fontWeight: 600,
                height: 40,
                fontSize: 14,
                color: '#2563EB',
                borderColor: '#BFDBFE',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 8,
              }}
            >
              {collapsed ? '' : 'Product Library'}
            </Button>
          </div>
        )}

        {/* Conversation List */}
        <ConversationList collapsed={collapsed} />

        {/* Bottom User Section */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            borderTop: '1px solid #F1F5F9',
            background: '#FFFFFF',
          }}
        >
          <Dropdown menu={userMenuItems} trigger={['click']} placement="topRight">
            <div
              style={{
                padding: collapsed ? '12px 8px' : '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                borderRadius: 0,
                transition: 'background 0.15s ease',
              }}
              className="cursor-pointer"
            >
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#2563EB',
                  flexShrink: 0,
                }}
              />
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', lineHeight: 1.3 }}>
                    {user?.username || 'User'}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {user?.role === 'admin' ? 'Administrator' : 'Member'}
                  </Text>
                </div>
              )}
            </div>
          </Dropdown>
        </div>
      </Sider>

      {/* Main Content Area */}
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #E2E8F0',
            height: 56,
            lineHeight: '56px',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
          {!collapsed && (
            <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 16, color: '#475569' }}>
              {isAdmin ? 'Product Library' : 'Chat'}
            </span>
          )}
        </Header>
        <Content
          id="main-content"
          style={{
            margin: 0,
            padding: 24,
            background: '#F8FAFC',
            minHeight: 'calc(100vh - 56px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
