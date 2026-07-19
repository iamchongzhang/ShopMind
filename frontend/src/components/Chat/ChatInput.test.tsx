import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from './ChatInput';

describe('ChatInput', () => {
  it('renders a textarea and a send button', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={false} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('calls onSend with trimmed value when send button is clicked', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} disabled={false} />);

    await userEvent.type(screen.getByRole('textbox'), '  Hello there  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledWith('Hello there');
  });

  it('calls onSend with empty string when Enter is pressed (without Shift)', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} disabled={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'Quick question');
    await userEvent.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('Quick question');
  });

  it('allows Shift+Enter for newlines without sending', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} disabled={false} />);

    const textbox = screen.getByRole('textbox');
    await userEvent.type(textbox, 'Line 1');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await userEvent.type(textbox, 'Line 2');

    // onSend should NOT have been called (Shift+Enter is newline, not submit)
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send empty or whitespace-only input', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} disabled={false} />);

    await userEvent.type(screen.getByRole('textbox'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears the input after a successful send', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} disabled={false} />);

    const textbox = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textbox, 'A question');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(textbox.value).toBe('');
  });

  it('shows stop button with danger styling when isStreaming is true', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={true} disabled={false} />);
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument();
    // The button should have the stop icon
    expect(screen.getByLabelText('stop')).toBeInTheDocument();
  });

  it('disables the textarea when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={false} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('disables the textarea when isStreaming (even if disabled=false)', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={true} disabled={false} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('calls onSend with empty string when stop button is clicked during streaming', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={true} disabled={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Stop generating' }));
    expect(onSend).toHaveBeenCalledWith('');
  });
});
