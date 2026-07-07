import { useState } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface Props {
  onSend: (question: string) => void;
  isStreaming: boolean;
  disabled: boolean;
}

export default function ChatInput({ onSend, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
        padding: '16px 0 0',
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          overflow: 'hidden',
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = '#2563EB';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(37,99,235,0.1)';
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = '#E2E8F0';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
        }}
      >
        <TextArea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Generating response...' : 'Ask about products, pricing, specs, shipping...'}
          disabled={disabled || isStreaming}
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{
            border: 'none',
            borderRadius: 0,
            padding: '12px 16px',
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'none',
            boxShadow: 'none',
          }}
          variant="borderless"
        />
      </div>
      <Button
        type="primary"
        icon={isStreaming ? <StopOutlined /> : <SendOutlined />}
        onClick={isStreaming ? () => onSend('') : handleSend}
        danger={isStreaming}
        size="large"
        aria-label={isStreaming ? 'Stop generating' : 'Send message'}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isStreaming
            ? '0 2px 8px rgba(220,38,38,0.3)'
            : '0 2px 8px rgba(37,99,235,0.25)',
          flexShrink: 0,
        }}
      />
    </div>
  );
}
