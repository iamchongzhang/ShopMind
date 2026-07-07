import { useState } from 'react';
import { Upload, message } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadDocument } from '../../api/knowledgeBase';
import { useQueryClient } from '@tanstack/react-query';

const { Dragger } = Upload;

export default function DocumentUploader() {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const props: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        const result = await uploadDocument(file);
        message.success(`${file.name} — uploaded successfully (ID: ${result.id})`);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Upload failed';
        message.error(msg);
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  return (
    <Dragger
      {...props}
      disabled={uploading}
      style={{
        marginBottom: 28,
        borderRadius: 14,
        border: '2px dashed #CBD5E1',
        background: '#FFFFFF',
        transition: 'all 0.2s ease',
        padding: '36px 24px',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <CloudUploadOutlined style={{ fontSize: 28, color: '#2563EB' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
        {uploading ? 'Uploading...' : 'Click or drag product documents to upload'}
      </p>
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
        Product specs, pricing sheets, manuals, catalogs — PDF, TXT, CSV, MD, DOCX, HTML — up to 50 MB
      </p>
    </Dragger>
  );
}
