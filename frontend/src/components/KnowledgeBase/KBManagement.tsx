import { Typography, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import DocumentUploader from './DocumentUploader';
import DocumentTable from './DocumentTable';

const { Title, Text } = Typography;

export default function KBManagement() {
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <Space align="center" style={{ marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
            }}
          >
            <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Poppins, sans-serif' }}>
            Product Library
          </Title>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginLeft: 52 }}>
          Upload and manage your product documents — specs, pricing sheets, manuals, FAQs, and more
        </Text>
      </div>

      <DocumentUploader />
      <DocumentTable />
    </div>
  );
}
