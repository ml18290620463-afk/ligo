import { DiaryEntry } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { asLegacyEntry, getEntryTimestamp, getEntryTitle } from './entryCompat';

export type NotesExportMode = 'all' | 'filtered' | string;

interface BuildBackupExportArgs {
  version: string;
  entries: DiaryEntry[];
  currentUser: string | null;
  now?: Date;
}

interface BuildNotesExportArgs {
  mode?: NotesExportMode;
  entries: DiaryEntry[];
  filteredEntries: DiaryEntry[];
  labels: TranslationDictionary;
  currentUser: string | null;
  now?: Date;
}

const imageDataMarkdownPattern = /!\[.*?\]\(data:image\/.*?;base64,.*?\)/g;

const exportTimestamp = (now = new Date()) => now.toISOString().replace(/[:.]/g, '-');

const exportUser = (currentUser: string | null) => (
  (currentUser || 'GUEST').toUpperCase().replace('@', '_')
);

const exportTitle = (entry: DiaryEntry) => (
  getEntryTitle(asLegacyEntry(entry), 'UNTITLED').toUpperCase().replace(/\s+/g, '_')
);

export const buildBackupExport = ({
  version,
  entries,
  currentUser,
  now,
}: BuildBackupExportArgs) => {
  const content = JSON.stringify({ version, entries }, null, 2);
  const filename = `VECTOR_${exportUser(currentUser)}_BACKUP_${exportTimestamp(now)}.json`;

  return { content, filename };
};

export const buildNotesExport = ({
  mode = 'all',
  entries,
  filteredEntries,
  labels,
  currentUser,
  now,
}: BuildNotesExportArgs) => {
  const targetEntries = mode === 'all'
    ? entries.filter(entry => !entry.isArchived)
    : mode === 'filtered'
      ? filteredEntries
      : entries.filter(entry => entry.id === mode);

  if (targetEntries.length === 0) return null;

  const content = [...targetEntries]
    .sort((a, b) => getEntryTimestamp(asLegacyEntry(b)) - getEntryTimestamp(asLegacyEntry(a)))
    .map(entry => {
      const timestamp = getEntryTimestamp(asLegacyEntry(entry));
      const date = new Date(timestamp).toLocaleString();
      const tags = entry.tags.join(', ');
      const cleanContent = entry.content.replace(imageDataMarkdownPattern, '[IMAGE_DATA]');

      return `==================================================
【 ${getEntryTitle(asLegacyEntry(entry))} 】
${labels.engravingTime}: ${date}
${labels.tags}: ${tags}
--------------------------------------------------
${cleanContent}
==================================================\n\n`;
    })
    .join('\n');

  const timestamp = exportTimestamp(now);
  const user = exportUser(currentUser);
  const filename = mode === 'all'
    ? `VECTOR_ALL_NOTES_${user}_${timestamp}.txt`
    : mode === 'filtered'
      ? `VECTOR_FILTERED_NOTES_${user}_${timestamp}.txt`
      : `VECTOR_NOTE_${exportTitle(targetEntries[0])}_${timestamp}.txt`;

  return { content, filename };
};
