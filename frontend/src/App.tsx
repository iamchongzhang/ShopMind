import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { router } from './router';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            // Design System: Minimalism & Swiss Style
            colorPrimary: '#2563EB',
            colorSuccess: '#16A34A',
            colorWarning: '#D97706',
            colorError: '#DC2626',
            colorInfo: '#2563EB',
            colorTextBase: '#1E293B',
            colorBgBase: '#FFFFFF',
            colorBgContainer: '#FFFFFF',
            colorBgLayout: '#F8FAFC',
            colorBorder: '#E2E8F0',
            colorBorderSecondary: '#F1F5F9',
            borderRadius: 8,
            borderRadiusLG: 12,
            borderRadiusSM: 6,
            fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 14,
            fontSizeHeading1: 32,
            fontSizeHeading2: 24,
            fontSizeHeading3: 20,
            fontSizeHeading4: 18,
            fontSizeHeading5: 16,
            lineHeight: 1.6,
            controlHeight: 38,
            controlHeightLG: 44,
            controlHeightSM: 32,
            padding: 16,
            paddingLG: 24,
            paddingSM: 12,
            paddingXS: 8,
            margin: 16,
            marginLG: 24,
            marginSM: 12,
            marginXS: 8,
            wireframe: false,
            motion: true,
            motionDurationSlow: '0.3s',
            motionDurationMid: '0.2s',
            motionDurationFast: '0.15s',
          },
          components: {
            Button: {
              borderRadius: 8,
              controlHeight: 38,
              controlHeightLG: 44,
              paddingContentHorizontal: 20,
              fontWeight: 500,
            },
            Input: {
              borderRadius: 8,
              controlHeight: 38,
              controlHeightLG: 44,
            },
            Card: {
              borderRadiusLG: 12,
              paddingLG: 24,
            },
            Table: {
              borderRadiusLG: 8,
              headerBg: '#F8FAFC',
              headerColor: '#475569',
              rowHoverBg: '#F1F5F9',
            },
            Menu: {
              itemBorderRadius: 8,
              itemMarginInline: 8,
              itemHeight: 40,
              iconSize: 18,
              collapsedIconSize: 18,
            },
            Layout: {
              bodyBg: '#F8FAFC',
              headerBg: '#FFFFFF',
              siderBg: '#FFFFFF',
              triggerBg: '#F1F5F9',
              triggerColor: '#475569',
            },
            Tag: {
              borderRadiusSM: 4,
            },
            Modal: {
              borderRadiusLG: 12,
              paddingLG: 24,
            },
          },
        }}
      >
        <AntApp>
          {/* Skip-to-content link for keyboard users */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          {/* Live region for screen reader announcements */}
          <div id="sr-announcements" className="sr-only" aria-live="polite" />
          <AuthInitializer>
            <RouterProvider router={router} />
          </AuthInitializer>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
