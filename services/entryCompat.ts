import { DiaryEntry } from '../types';

export type LegacyDiaryEntry = Partial<DiaryEntry> & {
  name?: string;
  subject?: string;
  text?: string;
  body?: string;
  details?: string;
  date?: number;
  timestamp?: number;
  inMemoryBoat?: boolean;
  archived?: boolean;
  location?: string;
};

export const asLegacyEntry = (entry: unknown): LegacyDiaryEntry =>
  entry && typeof entry === 'object' ? (entry as LegacyDiaryEntry) : {};

export const getEntryTimestamp = (entry: LegacyDiaryEntry) =>
  entry.createdAt || entry.timestamp || entry.date || 0;

export const getEntryTitle = (entry: LegacyDiaryEntry, fallback = 'Trace') =>
  entry.title || entry.subject || entry.name || fallback;

export const isMemoryBoatEntry = (entry: LegacyDiaryEntry) =>
  Boolean(
    entry.migrated ||
    entry.archivedToShip ||
    entry.inMemoryBoat ||
    entry.archived ||
    entry.location === 'memoryBoat',
  );

export const isMainVaultEntry = (entry: LegacyDiaryEntry) =>
  !entry.migrated &&
  !entry.archivedToShip &&
  !entry.inMemoryBoat &&
  !entry.archived &&
  entry.location !== 'memoryBoat';
