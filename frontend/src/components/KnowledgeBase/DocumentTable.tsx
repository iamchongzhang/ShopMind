import { Table, Tag, Button, Popconfirm, message, Space, Typography } from 'antd';
import { DeleteOutlined, ReloadOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as kbApi from '../../api/knowledgeBase';
import type { Document } from '../../types/knowledgeBase';
import { useState } from 'react';
import DocumentDetailDrawer from './DocumentDetail';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'blue', label: 'Pending' },
  processing: { color: 'processing', label: 'Processing' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
};

const fileTypeColors: Record<string, string> = {
  pdf: '#DC2626',
  txt: '#64748B',
  csv: '#16A34A',
  md: '#2563EB',
  docx: '#2563EB',
  html: '#D97706',
};

export default function DocumentTable() {
  const [page, setPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page],
    queryFn: () => kbApi.listDocuments(page),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: kbApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      message.success('Document deleted');
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: kbApi.reprocessDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      message.success('Reprocessing started');
    },
  });

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true,
      render: (name: string, record: Document) => (
        <Space>
          <FileOutlined style={{ color: fileTypeColors[record.file_type] || '#64748B' }} />
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 80,
      render: (type: string) => (
        <Tag style={{ borderRadius: 4, textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size: number | null) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {size ? `${(size / 1024).toFixed(1)} KB` : '—'}
        </Text>
      ),
    },
    {
      title: 'Chunks',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      width: 80,
      align: 'center' as const,
      render: (count: number) => (
        <Text style={{ fontSize: 13, fontWeight: 500 }}>{count}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 130,
      render: (date: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: Document) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedDoc(record.id)}
            aria-label={`View details for ${record.filename}`}
          />
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => reprocessMutation.mutate(record.id)}
            disabled={record.status === 'processing'}
            aria-label={`Reprocess ${record.filename}`}
          />
          <Popconfirm
            title="Delete this document?"
            description="This will remove this document from the Product Library."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${record.filename}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data?.items || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total || 0,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `${total} documents`,
        }}
        size="middle"
        locale={{ emptyText: 'No product documents uploaded yet' }}
      />

      <DocumentDetailDrawer
        documentId={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </>
  );
}
