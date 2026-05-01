import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiaryData } from './useDiaryData';
import * as idb from 'idb-keyval';
import { DiaryStorageKeys, getDiaryStorageKeys } from '../services/diaryStorage';
import { MOCK_ENTRIES } from '../constants';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

describe('useDiaryData', () => {
  const userId = 'test-user';
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(idb.get).mockResolvedValue(undefined);
  });

  it('should initialize with loading state', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    expect(result.current.loading).toBe(true);
  });

  it('should load mock data if no storage data exists', async () => {
    const { result } = renderHook(() => useDiaryData(userId, 'zh'));
    
    // Wait for useEffect to finish
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.entries.length).toBeGreaterThan(0);
  });

  it('should add an entry', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const initialCount = result.current.entries.length;
    
    await act(async () => {
      await result.current.addEntry({
        title: 'New Entry',
        content: 'Content',
        tags: ['test'],
      });
    });

    expect(result.current.entries.length).toBe(initialCount + 1);
    expect(result.current.entries[0].title).toBe('New Entry');
    expect(idb.set).toHaveBeenCalled();
  });

  it('should update an entry', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const entryToUpdate = result.current.entries[0];
    const updatedTitle = 'Updated Title';

    await act(async () => {
      await result.current.updateEntry({
        ...entryToUpdate,
        title: updatedTitle,
      });
    });

    expect(result.current.entries[0].title).toBe(updatedTitle);
  });

  it('should delete an entry', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const initialCount = result.current.entries.length;
    const entryToDelete = result.current.entries[0];

    await act(async () => {
      await result.current.deleteEntry(entryToDelete.id);
    });

    expect(result.current.entries.length).toBe(initialCount - 1);
  });

  it('should wipe data', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      await result.current.wipeData();
    });

    expect(result.current.entries.length).toBe(0);
    expect(result.current.principles.length).toBe(0);
    expect(idb.del).toHaveBeenCalled();
  });

  it('should handle principles', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      await result.current.addPrinciple('Test Principle', 2024);
    });

    expect(result.current.principles.length).toBe(1);
    expect(result.current.principles[0].text).toBe('Test Principle');

    const p = result.current.principles[0];
    await act(async () => {
      await result.current.deletePrinciple(p.id);
    });
    expect(result.current.principles.length).toBe(0);
  });

  it('should handle containers', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      result.current.addContainer('New Category');
    });

    expect(result.current.containers.length).toBe(1);
    expect(result.current.containers[0].name).toBe('New Category');

    const c = result.current.containers[0];
    await act(async () => {
      result.current.deleteContainer(c.id);
    });
    expect(result.current.containers.length).toBe(0);
  });

  it('should handle passwords', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    await act(async () => {
      await result.current.savePasswordHash('hash');
      await result.current.savePasswordSalt('salt');
    });

    expect(result.current.passwordHash).toBe('hash');
    expect(result.current.passwordSalt).toBe('salt');

    await act(async () => {
      await result.current.clearPasswordHash();
    });

    expect(result.current.passwordHash).toBe(null);
  });

  it('should handle archive/unarchive', async () => {
    const { result } = renderHook(() => useDiaryData(userId));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const entryId = result.current.entries[0].id;

    await act(async () => {
      await result.current.archiveEntry(entryId);
    });
    expect(result.current.entries.find(e => e.id === entryId)?.isArchived).toBe(true);

    await act(async () => {
      await result.current.unarchiveEntry(entryId);
    });
    expect(result.current.entries.find(e => e.id === entryId)?.isArchived).toBe(false);
  });

  it('should ignore stale async loads after language changes', async () => {
    let resolveFirstGet: ((value: undefined) => void) | null = null;
    let callCount = 0;

    vi.mocked(idb.get).mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise(resolve => {
          resolveFirstGet = resolve;
        });
      }
      return Promise.resolve(undefined);
    });

    const { result, rerender } = renderHook(
      ({ language }: { language: 'zh' | 'en' }) => useDiaryData(userId, language),
      { initialProps: { language: 'zh' as const } }
    );

    rerender({ language: 'en' as const });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.entries[0]?.title).toBe(MOCK_ENTRIES.en[0].title);

    await act(async () => {
      resolveFirstGet?.(undefined);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.entries[0]?.title).toBe(MOCK_ENTRIES.en[0].title);
  });

  it('should hydrate persisted vault metadata from storage', async () => {
    const keys = getDiaryStorageKeys(userId);
    localStorage.setItem(keys.passwordHash, 'persisted-hash');
    localStorage.setItem(keys.passwordSalt, 'persisted-salt');
    localStorage.setItem(keys.guidingStars, JSON.stringify(['Marcus Aurelius']));
    localStorage.setItem(keys.selectedStars, JSON.stringify(['Marcus Aurelius']));
    localStorage.setItem(keys.materials, JSON.stringify([{ type: 'image', name: 'img.png', data: 'data:' }]));
    localStorage.setItem(keys.containers, JSON.stringify([{ id: 'c1', name: 'Work', createdAt: 1 }]));

    const { result } = renderHook(() => useDiaryData(userId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.passwordHash).toBe('persisted-hash');
    expect(result.current.passwordSalt).toBe('persisted-salt');
    expect(result.current.guidingStars).toEqual(['Marcus Aurelius']);
    expect(result.current.selectedStars).toEqual(['Marcus Aurelius']);
    expect(result.current.materials).toHaveLength(1);
    expect(result.current.containers).toEqual([{ id: 'c1', name: 'Work', createdAt: 1 }]);
  });

  it('should wipe selected stars and materials storage keys', async () => {
    const keys = getDiaryStorageKeys(userId);
    const { result } = renderHook(() => useDiaryData(userId));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      await result.current.wipeData();
    });

    expect(idb.del).toHaveBeenCalledWith(keys.selectedStars);
    expect(idb.del).toHaveBeenCalledWith(keys.materials);
    expect(localStorage.getItem(DiaryStorageKeys.initializedFlag)).toBeNull();
  });
});
