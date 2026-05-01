import { useState, useEffect, useCallback, useRef } from 'react';
import { del, get, set } from 'idb-keyval';
import { DiaryEntry, Language, Principle, Attachment, Container } from '../types';
import { MOCK_ENTRIES } from '../constants';
import { AppError, reportError } from '../lib/error';
import { getStoredString } from '../services/browserStorage';
import {
  DiaryStorageKeys,
  getDiaryStorageKeys,
  mirrorDiaryValue,
  readDiaryJson,
  readDiaryString,
  removeDiaryMirror,
} from '../services/diaryStorage';
import { generateSecureId } from '../services/idGenerator';
import {
  mergeMigrationContainers,
  mergeMigrationEntries,
  mergeMigrationPrinciples,
  persistMigrationResult,
  scanLegacyDiaryData,
  delayMigrationStep,
} from '../services/diaryMigration';
import { asLegacyEntry } from '../services/entryCompat';

const sanitizeEntry = (entry: unknown): DiaryEntry => {
  const safeEntry = asLegacyEntry(entry);
  const now = Date.now();
  return {
    id: safeEntry.id || generateSecureId('rec'),
    title: safeEntry.title || safeEntry.name || 'Trace Record',
    content: safeEntry.content || safeEntry.text || safeEntry.body || '',
    createdAt: typeof safeEntry.createdAt === 'number' && !Number.isNaN(safeEntry.createdAt) ? safeEntry.createdAt : now,
    updatedAt: typeof safeEntry.updatedAt === 'number' && !Number.isNaN(safeEntry.updatedAt) ? safeEntry.updatedAt : now,
    tags: Array.isArray(safeEntry.tags) ? safeEntry.tags : [],
    isLocked: Boolean(safeEntry.isLocked),
    isEncrypted: Boolean(safeEntry.isEncrypted),
    isArchived: Boolean(safeEntry.isArchived),
    migrated: Boolean(safeEntry.migrated),
    archivedToShip: Boolean(safeEntry.archivedToShip),
    containerId: safeEntry.containerId || undefined,
    attachment: safeEntry.attachment || undefined,
    unlockAt: typeof safeEntry.unlockAt === 'number' && !Number.isNaN(safeEntry.unlockAt) ? safeEntry.unlockAt : undefined,
  };
};

const readStoredArray = async <T>(key: string): Promise<T[]> => {
  const idbValue = await get(key).catch(() => undefined);
  if (Array.isArray(idbValue)) return idbValue as T[];

  const localValue = readDiaryJson<T[]>(key);
  return Array.isArray(localValue) ? localValue : [];
};

const readStoredOptionalArray = async <T>(key: string): Promise<T[] | undefined> => {
  const idbValue = await get(key).catch(() => undefined);
  if (Array.isArray(idbValue)) return idbValue as T[];

  const localValue = readDiaryJson<T[]>(key);
  return Array.isArray(localValue) ? localValue : undefined;
};

const readStoredScalar = async (key: string): Promise<string | null> => {
  const idbValue = await get(key).catch(() => undefined);
  if (typeof idbValue === 'string') return idbValue;
  return readDiaryString(key) || null;
};

export const useDiaryData = (userId: string | undefined, language: Language = 'zh') => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [passwordSalt, setPasswordSalt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [guidingStars, setGuidingStars] = useState<string[]>([]);
  const [selectedStars, setSelectedStars] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Attachment[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local-only' | 'error' | 'merging'>('local-only');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const activeLoadIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const loadId = ++activeLoadIdRef.current;
    const isStale = () => cancelled || activeLoadIdRef.current !== loadId;

    const loadData = async () => {
      const keys = getDiaryStorageKeys(userId);

      try {
        setLoading(true);

        let currentEntries = await readStoredOptionalArray<DiaryEntry>(keys.entries);
        const isInitialized = getStoredString(keys.initializedFlag);

        if (!isInitialized) {
          console.log('Vector Vault: Starting deep migration scan...');
          const migrationResult = await scanLegacyDiaryData(userId);
          await persistMigrationResult(userId, migrationResult);
          if (migrationResult.entries.length > 0) currentEntries = migrationResult.entries;

          mirrorDiaryValue(keys.initializedFlag, 'true');
          console.log(`Vector Vault: Migration complete. Merged ${migrationResult.entries.length} entries.`);
        }

        if (!currentEntries) {
          currentEntries = await readStoredOptionalArray<DiaryEntry>(keys.entries);
        }

        if ((!currentEntries || currentEntries.length === 0)) {
          const backup = await readStoredOptionalArray<DiaryEntry>(keys.backup);
          if (backup && backup.length > 0) currentEntries = backup;
        }

        if ((!currentEntries || currentEntries.length === 0) && !isInitialized) {
          currentEntries = MOCK_ENTRIES[language];
          await set(keys.entries, currentEntries).catch(() => {});
          mirrorDiaryValue(keys.entries, JSON.stringify(currentEntries));
        }

        const currentPrinciples = await readStoredArray<Principle>(keys.principles);
        const currentPasswordHash = await readStoredScalar(keys.passwordHash);
        const currentPasswordSalt = await readStoredScalar(keys.passwordSalt);
        const currentGuidingStars = await readStoredArray<string>(keys.guidingStars);
        const currentSelectedStars = await readStoredArray<string>(keys.selectedStars);
        const currentMaterials = await readStoredArray<Attachment>(keys.materials);
        const currentContainers = await readStoredArray<Container>(keys.containers);

        if (isStale()) return;

        setEntries((currentEntries || []).map(sanitizeEntry));
        setPrinciples(currentPrinciples);
        setPasswordHash(currentPasswordHash);
        setPasswordSalt(currentPasswordSalt);
        setGuidingStars(currentGuidingStars);
        setSelectedStars(currentSelectedStars);
        setMaterials(currentMaterials);
        setContainers(currentContainers);
      } catch (error) {
        if (isStale()) return;

        reportError(AppError.fromError(error), 'loadData');
        setEntries(MOCK_ENTRIES[language] || []);
        setPrinciples([]);
        setPasswordHash(null);
        setPasswordSalt(null);
        setGuidingStars([]);
        setSelectedStars([]);
        setMaterials([]);
        setContainers([]);
      } finally {
        if (isStale()) return;
        setLoading(false);
        setSyncStatus('local-only');
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [userId, language]);

  const persistEntries = async (newEntries: DiaryEntry[]) => {
    const keys = getDiaryStorageKeys(userId);
    setEntries(newEntries);
    try {
      await set(keys.entries, newEntries).catch(err => {
        console.warn('IndexedDB set failed, falling back to localStorage', err);
        mirrorDiaryValue(keys.entries, JSON.stringify(newEntries));
      });
      await set(keys.backup, newEntries).catch(() => {});
    } catch (error) {
      reportError(AppError.fromError(error), 'persistEntries');
      setSyncStatus('error');
    }
  };

  const persistPrinciples = async (newPrinciples: Principle[]) => {
    const keys = getDiaryStorageKeys(userId);
    setPrinciples(newPrinciples);
    try {
      await set(keys.principles, newPrinciples).catch(err => {
        console.warn('IndexedDB set failed for principles, falling back to localStorage', err);
        mirrorDiaryValue(keys.principles, JSON.stringify(newPrinciples));
      });
    } catch (error) {
      console.error('Failed to save principles', error);
    }
  };

  const savePasswordHash = async (hash: string) => {
    const keys = getDiaryStorageKeys(userId);
    setPasswordHash(hash);
    await set(keys.passwordHash, hash).catch(() => {
      mirrorDiaryValue(keys.passwordHash, hash);
    });
  };

  const savePasswordSalt = async (salt: string) => {
    const keys = getDiaryStorageKeys(userId);
    setPasswordSalt(salt);
    await set(keys.passwordSalt, salt).catch(() => {
      mirrorDiaryValue(keys.passwordSalt, salt);
    });
  };

  const clearPasswordHash = async () => {
    const keys = getDiaryStorageKeys(userId);
    setPasswordHash(null);
    setPasswordSalt(null);
    await del(keys.passwordHash);
    await del(keys.passwordSalt);
    removeDiaryMirror(keys.passwordHash);
    removeDiaryMirror(keys.passwordSalt);
  };

  const saveGuidingStars = async (stars: string[]) => {
    const keys = getDiaryStorageKeys(userId);
    setGuidingStars(stars);
    await set(keys.guidingStars, stars).catch(() => {
      mirrorDiaryValue(keys.guidingStars, JSON.stringify(stars));
    });
  };

  const saveSelectedStars = async (stars: string[]) => {
    const keys = getDiaryStorageKeys(userId);
    setSelectedStars(stars);
    await set(keys.selectedStars, stars).catch(() => {
      mirrorDiaryValue(keys.selectedStars, JSON.stringify(stars));
    });
  };

  const addMaterial = useCallback(async (material: Attachment) => {
    const keys = getDiaryStorageKeys(userId);
    const newMaterials = [material, ...materials];
    setMaterials(newMaterials);
    await set(keys.materials, newMaterials).catch(() => {
      console.warn('Failed to save materials to IndexedDB');
    });
  }, [userId, materials]);

  const deleteMaterial = useCallback(async (index: number) => {
    const keys = getDiaryStorageKeys(userId);
    const newMaterials = materials.filter((_, currentIndex) => currentIndex !== index);
    setMaterials(newMaterials);
    await set(keys.materials, newMaterials).catch(() => {
      console.warn('Failed to save materials to IndexedDB');
    });
  }, [userId, materials]);

  const persistContainers = async (newContainers: Container[]) => {
    const keys = getDiaryStorageKeys(userId);
    setContainers(newContainers);
    try {
      await set(keys.containers, newContainers).catch(err => {
        console.warn('IndexedDB set failed for containers, falling back to localStorage', err);
        mirrorDiaryValue(keys.containers, JSON.stringify(newContainers));
      });
    } catch (error) {
      reportError(AppError.fromError(error), 'persistContainers');
    }
  };

  const addContainer = useCallback((name: string) => {
    const newContainer: Container = {
      id: generateSecureId('container'),
      name,
      createdAt: Date.now(),
    };
    persistContainers([newContainer, ...containers]);
  }, [containers, userId]);

  const deleteContainer = useCallback((id: string) => {
    const newContainers = containers.filter(container => container.id !== id);
    persistContainers(newContainers);
    const updatedEntries = entries.map(entry => (entry.containerId === id ? { ...entry, containerId: undefined } : entry));
    persistEntries(updatedEntries);
  }, [containers, entries, userId]);

  const addEntry = useCallback(async (data: Omit<DiaryEntry, 'id' | 'createdAt' | 'isLocked'>) => {
    const now = Date.now();
    const newEntry: DiaryEntry = {
      id: generateSecureId(),
      createdAt: now,
      updatedAt: now,
      isLocked: false,
      isArchived: false,
      migrated: false,
      archivedToShip: false,
      ...data,
    };
    persistEntries([newEntry, ...entries]);
  }, [entries, userId]);

  const updateEntry = useCallback(async (updatedEntry: DiaryEntry) => {
    const now = Date.now();
    const nextEntries = entries.map(entry => (entry.id === updatedEntry.id ? { ...updatedEntry, updatedAt: now } : entry));
    persistEntries(nextEntries);
  }, [entries, userId]);

  const bulkUpdateEntries = useCallback(async (updatedEntries: DiaryEntry[]) => {
    const now = Date.now();
    const updatedEntriesMap = new Map(updatedEntries.map(entry => [entry.id, { ...entry, updatedAt: now }]));
    const nextEntries = entries.map(entry => updatedEntriesMap.get(entry.id) || entry);
    persistEntries(nextEntries);
  }, [entries, userId]);

  const deleteEntry = useCallback(async (id: string) => {
    persistEntries(entries.filter(entry => entry.id !== id));
  }, [entries, userId]);

  const archiveEntry = useCallback(async (id: string) => {
    const now = Date.now();
    const nextEntries = entries.map(entry => (
      entry.id === id ? { ...entry, isArchived: true, archivedToShip: true, updatedAt: now } : entry
    ));
    persistEntries(nextEntries);
  }, [entries, userId]);

  const unarchiveEntry = useCallback(async (id: string) => {
    const now = Date.now();
    const nextEntries = entries.map(entry => (
      entry.id === id ? { ...entry, isArchived: false, archivedToShip: false, updatedAt: now } : entry
    ));
    persistEntries(nextEntries);
  }, [entries, userId]);

  const addPrinciple = useCallback(async (text: string, year: number, showOnHome: boolean = true) => {
    const newPrinciple: Principle = {
      id: generateSecureId(),
      text,
      year,
      createdAt: Date.now(),
      showOnHome,
    };
    persistPrinciples([newPrinciple, ...principles]);
  }, [principles, userId]);

  const deletePrinciple = useCallback(async (id: string) => {
    persistPrinciples(principles.filter(principle => principle.id !== id));
  }, [principles, userId]);

  const updatePrinciple = useCallback(async (updatedPrinciple: Principle) => {
    persistPrinciples(principles.map(principle => (
      principle.id === updatedPrinciple.id ? updatedPrinciple : principle
    )));
  }, [principles, userId]);

  const triggerScan = useCallback(async () => {
    try {
      const keys = getDiaryStorageKeys(userId);
      setIsScanning(true);
      setScanProgress(5);
      console.log('Vector Vault: Starting manual deep migration scan...');

      const migrationResult = await scanLegacyDiaryData(userId, {
        delayMs: 30,
        onProgress: setScanProgress,
      });

      setScanProgress(90);

      if (migrationResult.entries.length > 0) {
        const mergedEntries = mergeMigrationEntries(migrationResult.entries, entries);
        await set(keys.entries, mergedEntries).catch(() => {});
        mirrorDiaryValue(keys.entries, JSON.stringify(mergedEntries));
        setEntries(mergedEntries);
      }

      if (migrationResult.principles.length > 0) {
        const mergedPrinciples = mergeMigrationPrinciples(migrationResult.principles, principles);
        await set(keys.principles, mergedPrinciples).catch(() => {});
        mirrorDiaryValue(keys.principles, JSON.stringify(mergedPrinciples));
        setPrinciples(mergedPrinciples);
      }

      if (migrationResult.containers.length > 0) {
        const mergedContainers = mergeMigrationContainers(migrationResult.containers, containers);
        await set(keys.containers, mergedContainers).catch(() => {});
        mirrorDiaryValue(keys.containers, JSON.stringify(mergedContainers));
        setContainers(mergedContainers);
      }

      if (migrationResult.passwordHash) {
        await set(keys.passwordHash, migrationResult.passwordHash).catch(() => {});
        mirrorDiaryValue(keys.passwordHash, migrationResult.passwordHash);
        setPasswordHash(migrationResult.passwordHash);
      }

      if (migrationResult.passwordSalt) {
        await set(keys.passwordSalt, migrationResult.passwordSalt).catch(() => {});
        mirrorDiaryValue(keys.passwordSalt, migrationResult.passwordSalt);
        setPasswordSalt(migrationResult.passwordSalt);
      }

      mirrorDiaryValue(keys.initializedFlag, 'true');
      setScanProgress(100);
      console.log(`Vector Vault: Manual scan complete. Merged ${migrationResult.entries.length} entries.`);

      await delayMigrationStep(1000);
      setIsScanning(false);
      setScanProgress(0);
    } catch (error) {
      console.error('Scan failed', error);
      setIsScanning(false);
    }
  }, [userId, entries, principles, containers]);

  const wipeData = useCallback(async () => {
    const keys = getDiaryStorageKeys(userId);

    setEntries([]);
    setPrinciples([]);
    setGuidingStars([]);
    setSelectedStars([]);
    setPasswordHash(null);
    setPasswordSalt(null);
    setMaterials([]);
    setContainers([]);

    const storageKeys = [
      keys.entries,
      keys.principles,
      keys.passwordHash,
      keys.passwordSalt,
      keys.guidingStars,
      keys.selectedStars,
      keys.materials,
      keys.containers,
      keys.backup,
    ];

    for (const key of storageKeys) {
      removeDiaryMirror(key);
      await del(key);
    }

    removeDiaryMirror(DiaryStorageKeys.initializedFlag);
  }, [userId]);

  return {
    entries,
    principles,
    addEntry,
    updateEntry,
    bulkUpdateEntries,
    deleteEntry,
    archiveEntry,
    unarchiveEntry,
    addPrinciple,
    deletePrinciple,
    updatePrinciple,
    wipeData,
    passwordHash,
    passwordSalt,
    savePasswordHash,
    savePasswordSalt,
    clearPasswordHash,
    guidingStars,
    saveGuidingStars,
    selectedStars,
    saveSelectedStars,
    materials,
    addMaterial,
    deleteMaterial,
    containers,
    addContainer,
    deleteContainer,
    loading,
    syncStatus,
    isScanning,
    scanProgress,
    triggerScan,
  };
};
