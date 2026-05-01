import { getStoredJson, getStoredString, removeStoredValue, setStoredString } from './browserStorage';

const MIRROR_SKIP_LIMIT = 100000;

export const DiaryStorageKeys = {
  entries: 'vector_master_vault_entries',
  principles: 'vector_master_vault_principles',
  passwordHash: 'vector_master_vault_pwd_hash',
  passwordSalt: 'vector_master_vault_pwd_salt',
  guidingStars: 'vector_master_vault_stars',
  containers: 'vector_master_vault_containers',
  backup: 'vector_backup_unified',
  initializedFlag: 'vector_vault_v1_initialized',
} as const;

export const DIARY_LEGACY_KEYS = [
  'vector_data_local-user',
  'vector_data_guest',
  'vector_data_undefined',
  'vector_data_',
  'safeDiaryRecords',
  'encryptedNotes',
  'journalList',
  'records',
  'notesData',
  'diary_entries',
] as const;

export const getSelectedStarsStorageKey = (uid: string | undefined) => `vector_selected_stars_${uid || 'default'}`;
export const getMaterialsStorageKey = (uid: string | undefined) => `vector_materials_${uid || 'default'}`;

export const getDiaryStorageKeys = (uid: string | undefined) => ({
  entries: DiaryStorageKeys.entries,
  principles: DiaryStorageKeys.principles,
  passwordHash: DiaryStorageKeys.passwordHash,
  passwordSalt: DiaryStorageKeys.passwordSalt,
  guidingStars: DiaryStorageKeys.guidingStars,
  selectedStars: getSelectedStarsStorageKey(uid),
  materials: getMaterialsStorageKey(uid),
  containers: DiaryStorageKeys.containers,
  backup: DiaryStorageKeys.backup,
  initializedFlag: DiaryStorageKeys.initializedFlag,
});

export function mirrorDiaryValue(key: string, value: string): boolean {
  if (value.length > MIRROR_SKIP_LIMIT && (key === DiaryStorageKeys.entries || key === DiaryStorageKeys.backup)) {
    console.log(`Vector Vault: Data for ${key} is large, skipping localStorage mirror.`);
    return false;
  }

  return setStoredString(key, value);
}

export function readDiaryJson<T>(key: string): T | undefined {
  return getStoredJson<T>(key) ?? undefined;
}

export function readDiaryString(key: string): string | undefined {
  return getStoredString(key) ?? undefined;
}

export function removeDiaryMirror(key: string) {
  removeStoredValue(key);
}
