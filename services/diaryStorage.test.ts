import { beforeEach, describe, expect, it } from 'vitest';
import {
  DiaryStorageKeys,
  getDiaryStorageKeys,
  mirrorDiaryValue,
  readDiaryJson,
  readDiaryString,
  removeDiaryMirror,
} from './diaryStorage';

describe('diaryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds user-scoped storage keys', () => {
    expect(getDiaryStorageKeys('user-1')).toMatchObject({
      entries: DiaryStorageKeys.entries,
      selectedStars: 'vector_selected_stars_user-1',
      materials: 'vector_materials_user-1',
    });
  });

  it('mirrors and reads string values', () => {
    expect(mirrorDiaryValue(DiaryStorageKeys.passwordHash, 'hash')).toBe(true);
    expect(readDiaryString(DiaryStorageKeys.passwordHash)).toBe('hash');
  });

  it('reads mirrored json values', () => {
    mirrorDiaryValue(DiaryStorageKeys.principles, JSON.stringify([{ id: 'p1' }]));
    expect(readDiaryJson<{ id: string }[]>(DiaryStorageKeys.principles)).toEqual([{ id: 'p1' }]);
  });

  it('removes mirrored values', () => {
    mirrorDiaryValue(DiaryStorageKeys.initializedFlag, 'true');
    removeDiaryMirror(DiaryStorageKeys.initializedFlag);
    expect(readDiaryString(DiaryStorageKeys.initializedFlag)).toBeUndefined();
  });
});
