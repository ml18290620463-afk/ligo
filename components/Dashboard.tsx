import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { DiaryEntry, GroupingMode, Language, Theme, Attachment, Container } from '../types';
import { useSearch } from '../hooks/useSearch';
import { useTransientState } from '../hooks/useTransientState';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { TRANSLATIONS } from '../constants';
import { AppStorageKeys } from '../services/appSettings';
import { getStoredString, setStoredString } from '../services/browserStorage';
import { downloadTextFile } from '../services/fileDownload';
import { useAttachmentUpload } from '../hooks/useAttachmentUpload';
import { useBackupImport } from '../hooks/useBackupImport';
import { useDashboardVault } from '../hooks/useDashboardVault';
import { useGuidingStarsEditor } from '../hooks/useGuidingStarsEditor';
import { useDashboardSecurity } from '../hooks/useDashboardSecurity';
import { useBackupReminder } from '../hooks/useBackupReminder';
import { VaultUnlockModal } from './VaultUnlockModal';
import { BackupImportConfirmModal } from './BackupImportConfirmModal';
import { BackupReminderBanner } from './BackupReminderBanner';
import { FilterHub } from './FilterHub';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { SettingsPanel } from './SettingsPanel';
import { DashboardFooter } from './DashboardFooter';
import { VaultContent } from './VaultContent';
import { useClickOutside } from '../hooks/useClickOutside';
import { groupDashboardEntries, sortDashboardGroupKeys } from '../services/dashboardGrouping';
import { buildBackupExport, buildNotesExport, NotesExportMode } from '../services/dashboardExport';
import { getActiveDashboardEntries, getBaseDashboardEntries } from '../services/dashboardFilters';

interface DashboardProps {
  entries: DiaryEntry[];
  currentUser: string | null;
  isGuest: boolean;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectEntry: (entry: DiaryEntry) => void;
  onUpdateEntry: (entry: DiaryEntry) => void;
  onBulkUpdateEntries: (entries: DiaryEntry[]) => void;
  onNewEntry: () => void;
  onOpenArchive: () => void;
  onReplayIntro: () => void;
  onWipeData: () => void;
  onCreateMaterialEntry: (material: Attachment, isArchived: boolean) => void;
  isUnlocked: boolean;
  passwordHash: string | null;
  passwordSalt: string | null;
  onSetPassword: (password: string) => void;
  onClearPassword: () => void;
  onImportBackup?: (
    entries: DiaryEntry[],
    mode: 'merge' | 'replace',
  ) => Promise<{ importedCount: number; totalAfter: number; mode: 'merge' | 'replace' }>;
  guidingStars: string[];
  onSaveGuidingStars: (stars: string[]) => void;
  selectedStars: string[];
  onSaveSelectedStars: (stars: string[]) => void;
  containers: Container[];
  onAddContainer: (name: string) => void;
  onDeleteContainer: (id: string) => void;
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  isScanning?: boolean;
  scanProgress?: number;
  onTriggerScan?: () => Promise<unknown>;
  lastScanSummary?: {
    status: 'success' | 'error';
    finishedAt: number;
    mergedEntries: number;
    mergedPrinciples: number;
    mergedContainers: number;
    error?: string;
  } | null;
  syncStatus?: 'synced' | 'local-only' | 'error' | 'merging' | 'mirror-skipped';
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  currentUser,
  isGuest,
  language,
  onSetLanguage,
  theme,
  onSetTheme,
  onSelectEntry,
  onUpdateEntry,
  onBulkUpdateEntries,
  onNewEntry,
  onOpenArchive,
  onReplayIntro,
  onWipeData,
  onCreateMaterialEntry,
  isUnlocked,
  passwordHash,
  passwordSalt,
  onSetPassword,
  onClearPassword,
  onImportBackup,
  guidingStars,
  onSaveGuidingStars,
  selectedStars,
  onSaveSelectedStars,
  containers,
  onAddContainer,
  onDeleteContainer,
  isScanning,
  scanProgress,
  onTriggerScan,
  lastScanSummary,
  syncStatus,
  loading,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { scheduleTimeout } = useTimeoutManager();
  const PAGE_SIZE = 50;

  const t = TRANSLATIONS[language];

  const [customIdentity, setCustomIdentity] = useState(
    () => getStoredString(AppStorageKeys.customIdentity) || currentUser || '',
  );

  useEffect(() => {
    setStoredString(AppStorageKeys.customIdentity, customIdentity);
  }, [customIdentity]);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);

  // Go Home Animation State
  const [isSailingHome, setIsSailingHome] = useState(false);

  const { backupReminderActive, daysSinceBackup, recordBackup } = useBackupReminder(
    entries.length,
  );

  const handleGoHomeClick = () => {
    setIsSailingHome(true);
    scheduleTimeout(() => {
      onReplayIntro();
      setIsSailingHome(false);
    }, 1000);
  };

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Hub State
  const [showFilterHub, setShowFilterHub] = useState(false);

  const {
    isVaultOpen,
    isVerifyingVault,
    vaultPassword,
    setVaultPassword,
    vaultError,
    handleToggleVault,
    handleVaultUnlock,
    handleVaultCancel,
  } = useDashboardVault({
    isUnlocked,
    passwordHash,
    passwordSalt,
    onSetPassword,
  });

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all');

  const activeEntries = React.useMemo(() => getActiveDashboardEntries(entries), [entries]);

  const baseFilteredEntries = React.useMemo(() => {
    return getBaseDashboardEntries({ entries, selectedTag, selectedCategory });
  }, [entries, selectedCategory, selectedTag]);

  const filteredEntries = useSearch(baseFilteredEntries, searchQuery);

  const paginatedEntries = React.useMemo(() => {
    return filteredEntries.slice(0, currentPage * PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const hasMore = paginatedEntries.length < filteredEntries.length;

  const handleSetGroupingMode = (mode: GroupingMode) => {
    setGroupingMode(mode);
    setCurrentPage(1);
    // Smooth scroll to top when changing perspective
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Wipe Safety State
  const [wipeMode, setWipeMode] = useState(false);
  const [wipeInput, setWipeInput] = useState('');

  const {
    securityMode,
    setSecurityMode,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    securityError,
    securitySuccess,
    handleSecuritySetup,
    showError: showSecurityError,
  } = useDashboardSecurity({
    passwordHash,
    passwordSalt,
    entries,
    onSetPassword,
    onBulkUpdateEntries,
    copy: {
      passwordRequirement: t.passwordRequirement,
      passwordMismatch: t.passwordMismatch,
      passwordVerifyFailed: t.passwordVerifyFailed,
      passwordChangeSuccess: t.passwordChangeSuccess,
      reEncryptFailureWarning: (n) =>
        `WARNING: ${n} entries could not be decrypted with your current password. Changing the master password now will lock these entries permanently with the old keys. Continue?`,
    },
    setIsFullscreen,
  });

  // Grouping State
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');

  // Reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [language, selectedTag, selectedCategory, groupingMode]);

  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isViewingRecovery, setIsViewingRecovery] = useState(false);
  const [showSecurityPassword, setShowSecurityPassword] = useState(false);
  const [recoveryKeyValue, setRecoveryKeyValue] = useState<string | null>(null);

  // Language Dropdown State
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useClickOutside<HTMLDivElement>(showLangDropdown, () =>
    setShowLangDropdown(false),
  );
  const [stagedMaterial, setStagedMaterial] = useState<Attachment | null>(null);
  const {
    value: mediaError,
    setValue: setMediaError,
    showValue: showMediaError,
  } = useTransientState<string | null>(null);
  const {
    value: mediaSuccess,
    setValue: setMediaSuccess,
    showValue: showMediaSuccess,
  } = useTransientState<string | null>(null);

  const [exportTarget, setExportTarget] = useState<'all' | string>('all');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(isExportDropdownOpen, () =>
    setIsExportDropdownOpen(false),
  );

  const [pendingImportConfirm, setPendingImportConfirm] = useState<{
    message: string;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const {
    inputRef: importInputRef,
    handleChange: handleImportBackup,
    status: importStatus,
  } = useBackupImport({
    onImportBackup,
    t,
    confirm: (message) =>
      new Promise<boolean>((resolve) => {
        setPendingImportConfirm({ message, resolve });
      }),
    reportError: (error) => {
      console.error('Backup import failed', error);
    },
  });

  const resolveImportConfirm = (ok: boolean) => {
    if (pendingImportConfirm) pendingImportConfirm.resolve(ok);
    setPendingImportConfirm(null);
  };

  const {
    inputRef: mediaInputRef,
    isUploading,
    handleChange: handleMediaUpload,
  } = useAttachmentUpload({
    onTooLarge: () => {
      setMediaError(null);
      showMediaError(t.fileTooLarge);
    },
    onLargeWarning: () =>
      showMediaSuccess(t.fileLargeWarning ?? 'Large attachment may slow saves and backups.'),
    onReadError: () => showMediaError(t.uploadError),
    onStaged: (attachment) => {
      setMediaError(null);
      setStagedMaterial(attachment);
    },
  });

  // (click-outside / Escape handlers live in `useClickOutside` now.)

  const [selectedNoteId, setSelectedNoteId] = useState<string>('all');

  const {
    isEditing: isEditingStars,
    setIsEditing: setIsEditingStars,
    tempDirectory,
    tempSelected,
    customStarName,
    setCustomStarName,
    toggleTempStar,
    handleDeleteCustomStar,
    handleAddCustomStar,
    handleSaveStars,
  } = useGuidingStarsEditor({
    guidingStars,
    selectedStars,
    language,
    showSettings,
    limitMessage: t.guidingStarsLimit,
    onLimitExceeded: showSecurityError,
    onSaveGuidingStars,
    onSaveSelectedStars,
  });

  // Update current time every second to for live countdown removed

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((e) => console.error(e));
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch((e) => console.error(e));
      }
    }
  };

  const getDynamicVersion = () => {
    const years = new Set(entries.map((e) => new Date(e.createdAt).getFullYear()));
    const yearCount = Math.max(1, years.size);
    const totalEntries = entries.length;
    const deepArchiveCount = entries.filter((e) => e.isArchived).length;
    return `v${yearCount}.${totalEntries}.${deepArchiveCount}`;
  };
  const dynamicVersion = getDynamicVersion();

  const handleExport = () => {
    const backup = buildBackupExport({
      version: dynamicVersion,
      entries,
      currentUser,
    });

    downloadTextFile(backup.content, backup.filename);

    // Phase 2 §2.d — record the timestamp so the Dashboard banner can
    // tell the user how stale their backup is. The hook owns the
    // `setStoredString(AppStorageKeys.lastBackupAt, …)` write so the
    // dashboard never touches the storage key directly.
    recordBackup();
  };

  const handleDownloadNotes = (mode: NotesExportMode = 'all') => {
    const notes = buildNotesExport({
      mode,
      entries,
      filteredEntries,
      labels: t,
      currentUser,
    });

    if (notes) downloadTextFile(notes.content, notes.filename);
  };

  // (handleSecuritySetup lives in useDashboardSecurity now.)

  const handleWipeRequest = () => {
    setWipeMode(true);
    setWipeInput('');
  };

  const handleWipeConfirm = () => {
    if (wipeInput === 'DELETE') {
      onWipeData();
      setShowSettings(false);
      setWipeMode(false);
    }
  };

  const groupedEntries = React.useMemo(() => {
    return groupDashboardEntries({
      filteredEntries,
      paginatedEntries,
      groupingMode,
      language,
      labels: t,
    });
  }, [filteredEntries, paginatedEntries, groupingMode, language, t]);

  const groupKeys = React.useMemo(() => {
    return sortDashboardGroupKeys(groupedEntries);
  }, [groupedEntries]);

  const isListView = filteredEntries.length > 10;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl min-h-screen flex flex-col relative z-10">
      <DashboardHeader
        theme={theme}
        language={language}
        dynamicVersion={dynamicVersion}
        isFullscreen={isFullscreen}
        onOpenArchive={onOpenArchive}
        onNewEntry={onNewEntry}
        toggleFullScreen={toggleFullScreen}
        setShowSettings={setShowSettings}
        showConfirmHome={showConfirmHome}
        setShowConfirmHome={setShowConfirmHome}
        lastClickTime={lastClickTime}
        setLastClickTime={setLastClickTime}
        onReplayIntro={onReplayIntro}
        syncStatus={syncStatus}
      />

      <BackupReminderBanner
        active={backupReminderActive}
        daysSinceBackup={daysSinceBackup}
        theme={theme}
        t={t}
        onOpenSettings={() => setShowSettings(true)}
      />

      <BackupImportConfirmModal
        pending={pendingImportConfirm}
        theme={theme}
        t={t}
        onResolve={resolveImportConfirm}
      />

      <VaultUnlockModal
        open={isVerifyingVault}
        theme={theme}
        language={language}
        t={t}
        vaultPassword={vaultPassword}
        setVaultPassword={setVaultPassword}
        vaultError={vaultError}
        onUnlock={handleVaultUnlock}
        onCancel={handleVaultCancel}
      />

      <SettingsPanel
        theme={theme}
        language={language}
        onSetLanguage={onSetLanguage}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isViewingRecovery={isViewingRecovery}
        setIsViewingRecovery={setIsViewingRecovery}
        securityMode={securityMode}
        setSecurityMode={setSecurityMode}
        passwordHash={passwordHash}
        customIdentity={customIdentity}
        setCustomIdentity={setCustomIdentity}
        dynamicVersion={dynamicVersion}
        isUnlocked={isUnlocked}
        onSetTheme={onSetTheme}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        securityError={securityError}
        securitySuccess={securitySuccess}
        handleSecuritySetup={handleSecuritySetup}
        isEditingStars={isEditingStars}
        setIsEditingStars={setIsEditingStars}
        tempDirectory={tempDirectory}
        tempSelected={tempSelected}
        customStarName={customStarName}
        setCustomStarName={setCustomStarName}
        toggleTempStar={toggleTempStar}
        handleDeleteCustomStar={handleDeleteCustomStar}
        handleAddCustomStar={handleAddCustomStar}
        handleSaveStars={handleSaveStars}
        selectedStars={selectedStars}
        mediaInputRef={mediaInputRef}
        handleMediaUpload={handleMediaUpload}
        isUploading={isUploading}
        stagedMaterial={stagedMaterial}
        setStagedMaterial={setStagedMaterial}
        onCreateMaterialEntry={onCreateMaterialEntry}
        setMediaSuccess={(message) => {
          if (message === null) {
            setMediaSuccess(null);
            return;
          }
          showMediaSuccess(message);
        }}
        mediaError={mediaError}
        mediaSuccess={mediaSuccess}
        activeEntries={activeEntries}
        handleExport={handleExport}
        dropdownRef={dropdownRef}
        isExportDropdownOpen={isExportDropdownOpen}
        setIsExportDropdownOpen={setIsExportDropdownOpen}
        exportTarget={exportTarget}
        setExportTarget={setExportTarget}
        handleDownloadNotes={handleDownloadNotes}
        entries={entries}
        importInputRef={importInputRef}
        handleImportBackup={onImportBackup ? handleImportBackup : undefined}
        importStatus={importStatus}
        wipeInput={wipeInput}
        setWipeInput={setWipeInput}
        handleWipeConfirm={handleWipeConfirm}
        setWipeMode={setWipeMode}
        handleGoHomeClick={handleGoHomeClick}
        isSailingHome={isSailingHome}
        isScanning={isScanning}
        scanProgress={scanProgress}
        onTriggerScan={onTriggerScan}
        lastScanSummary={lastScanSummary}
      />

      <FilterBar
        theme={theme}
        language={language}
        showFilterHub={showFilterHub}
        isVaultOpen={isVaultOpen}
        onToggleVault={handleToggleVault}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        groupingMode={groupingMode}
        setGroupingMode={handleSetGroupingMode}
        isEditingStars={isEditingStars}
        entriesCount={baseFilteredEntries.length}
      />

      <AnimatePresence>
        {showFilterHub && (
          <FilterHub
            language={language}
            theme={theme}
            entries={activeEntries}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            containers={containers}
            onAddContainer={onAddContainer}
            onDeleteContainer={onDeleteContainer}
            onClose={() => setShowFilterHub(false)}
            groupingMode={groupingMode}
            onGroupingModeChange={handleSetGroupingMode}
          />
        )}
      </AnimatePresence>

      <VaultContent
        isVaultOpen={isVaultOpen}
        onUnsealRequest={handleToggleVault}
        loading={loading}
        theme={theme}
        language={language}
        t={t}
        searchQuery={searchQuery}
        paginatedEntries={paginatedEntries}
        filteredEntries={filteredEntries}
        hasMore={hasMore}
        onLoadMore={() => setCurrentPage((prev) => prev + 1)}
        groupingMode={groupingMode}
        groupedEntries={groupedEntries}
        groupKeys={groupKeys}
        isListView={isListView}
        onSelectEntry={onSelectEntry}
        showFilterHub={showFilterHub}
        setShowFilterHub={setShowFilterHub}
        customIdentity={customIdentity}
        currentUser={currentUser}
      />

      <DashboardFooter
        theme={theme}
        t={t}
        isSailingHome={isSailingHome}
        onGoHome={handleGoHomeClick}
      />
    </div>
  );
};
