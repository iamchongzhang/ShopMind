import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders plain text in a paragraph', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold markdown as a <strong> element', () => {
    render(<MarkdownRenderer content="This is **important** text" />);
    const strong = screen.getByText('important');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders GFM tables', () => {
    render(<MarkdownRenderer content={'| A | B |\n|---|---|\n| 1 | 2 |'} />);
    // The table should render with <th> or <td> elements
    expect(screen.getByText('A').tagName).toBe('TH');
    expect(screen.getByText('B').tagName).toBe('TH');
    expect(screen.getByText('1').tagName).toBe('TD');
    expect(screen.getByText('2').tagName).toBe('TD');
  });

  it('renders empty string without crashing', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    // Should render an empty markdown-body div
    expect(container.querySelector('.markdown-body')).toBeInTheDocument();
  });
});
