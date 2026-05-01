import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EntryGrid } from './EntryGrid';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { DiaryEntry } from '../types';

const mockEntries: DiaryEntry[] = [
  { id: '1', title: 'Test 1', content: 'C1', tags: ['tag'], createdAt: Date.now(), updatedAt: Date.now(), isLocked: false },
];

const mockProps = {
  theme: 'dark' as const,
  language: 'zh' as const,
  searchQuery: '',
  filteredEntries: mockEntries,
  groupingMode: 'none' as const,
  groupedEntries: { 'ALL': mockEntries },
  groupKeys: ['ALL'],
  isListView: true,
  now: Date.now(),
  onSelectEntry: vi.fn(),
  showFilterHub: false,
  setShowFilterHub: vi.fn(),
  disableVirtualization: true,
};

describe('EntryGrid', () => {
  afterEach(cleanup);

  beforeEach(() => {
    // Mock getBoundingClientRect for parentRef in JSDOM
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1024,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1024,
    });
  });

  it('renders entries in list view', () => {
    render(<EntryGrid {...mockProps} />);
    expect(screen.getByText('Test 1')).toBeDefined();
  });

  it('triggers onSelectEntry when clicked', () => {
    render(<EntryGrid {...mockProps} />);
    fireEvent.click(screen.getByText('Test 1'));
    expect(mockProps.onSelectEntry).toHaveBeenCalledWith(mockEntries[0]);
  });

  it('renders card view when isListView is false', () => {
    render(<EntryGrid {...mockProps} isListView={false} />);
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('#tag')).toBeDefined();
  });
  
  it('renders empty state when no entries', () => {
    render(<EntryGrid {...mockProps} filteredEntries={[]} />);
    expect(screen.getByText(/过往皆为判断的注脚/i)).toBeDefined();
  });
});
