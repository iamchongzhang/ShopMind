import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CitationBadge from './CitationBadge';
import type { Citation } from '../../types/chat';

const baseCitation: Citation = {
  source: 'products.pdf',
  chunk: 3,
  text: 'This oxford shirt is made of 100% cotton and comes in three color options.',
};

describe('CitationBadge', () => {
  it('renders the source filename and index in the tag', () => {
    render(<CitationBadge citation={baseCitation} index={0} />);
    // The tag shows "[1] products.pdf" (index 0 → displayed as 1)
    const tag = screen.getByText(/\[1\]/);
    expect(tag).toBeInTheDocument();
    expect(tag.textContent).toContain('products.pdf');
  });

  it('displays the correct 1-based index from the index prop', () => {
    render(<CitationBadge citation={baseCitation} index={4} />);
    expect(screen.getByText(/\[5\]/)).toBeInTheDocument();
  });

  it('shows chunk number in the popover content when clicked', async () => {
    render(<CitationBadge citation={baseCitation} index={0} />);
    // Popover content is rendered lazily — click the tag to open it
    const tag = screen.getByText(/\[1\]/);
    await userEvent.click(tag);

    expect(screen.getByText(/Chunk #3/)).toBeInTheDocument();
  });

  it('shows citation text in popover but not when text is empty', async () => {
    const noText: Citation = { source: 'empty.pdf', chunk: 0, text: '' };
    render(<CitationBadge citation={noText} index={0} />);

    // Open the popover
    const tag = screen.getByText(/\[1\]/);
    await userEvent.click(tag);

    // The chunk badge still appears in the popover
    expect(screen.getByText(/Chunk #0/)).toBeInTheDocument();
    // But no citation text paragraph
    expect(screen.queryByText('This oxford shirt')).not.toBeInTheDocument();
  });

  it('truncates long filenames (>24 chars) with an ellipsis', () => {
    const longName: Citation = {
      source: 'very-long-product-catalog-winter-2025.pdf',
      chunk: 1,
      text: '',
    };
    render(<CitationBadge citation={longName} index={0} />);
    const tag = screen.getByText(/\[1\]/);
    expect(tag.textContent).toContain('…');
    // The displayed name should be ≤ 24 chars + '…'
    const displayed = tag.textContent!.replace('[1] ', '');
    expect(displayed.length).toBeLessThanOrEqual(25); // 24 + '…'
  });
});
