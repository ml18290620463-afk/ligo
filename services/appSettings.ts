export const AppStorageKeys = {
  theme: 'vector_theme',
  customIdentity: 'vector_custom_identity',
  recoveryVerifier: 'vector_recovery_hash',
  aiProvider: 'user_ai_provider',
  legacyAiApiKey: 'user_ai_key',
  vaultUnlocked: 'vector_vault_unlocked',
  draftTitle: 'neonlog_draft_title',
  draftContent: 'neonlog_draft_content',
  draftTags: 'neonlog_draft_tags',
  /**
   * Timestamp (`Date.now()` ms) of the last successful "Export Star Map"
   * backup. Used by `Dashboard` to show a "you haven't exported in
   * X days" banner once the gap exceeds `BACKUP_REMINDER_DAYS`.
   */
  lastBackupAt: 'vector_last_backup_at',
} as const;

/** How stale a backup must be before the Dashboard banner appears. */
export const BACKUP_REMINDER_DAYS = 60;
export const BACKUP_REMINDER_MS = BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
