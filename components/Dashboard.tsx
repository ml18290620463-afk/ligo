import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { DiaryEntry, Language, Theme, Attachment, Container } from '../types';
import { useSearch } from '../hooks/useSearch';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { TRANSLATIONS } from '../constants';
import { AppStorageKeys } from '../services/appSettings';
import { getStoredString, setStoredString } from '../services/browserStorage';
import { useBackupImport } from '../hooks/useBackupImport';
import { useDashboardVault } from '../hooks/useDashboardVault';
import { useBackupReminder } from '../hooks/useBackupReminder';
import { VaultUnlockModal } from './VaultUnlockModal';
import { BackupImportConfirmModal } from './BackupImportConfirmModal';
import { BackupReminderBanner } from './BackupReminderBanner';
import { FilterHub } from './FilterHub';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { DashboardSettingsModal } from './DashboardSettingsModal';
import { DashboardFooter } from './DashboardFooter';
import { VaultContent } from './VaultContent';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDashboardExport } from '../hooks/useDashboardExport';
import { useDashboardImportConfirm } from '../hooks/useDashboardImportConfirm';
import { useDashboardFullscreen } from '../hooks/useDashboardFullscreen';
import { useDashboardGroupedEntries } from '../hooks/useDashboardGroupedEntries';
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

  const { isFullscreen, toggleFullScreen, setIsFullscreen } = useDashboardFullscreen();

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

  // Settings-only state (security / stars editor / wipe / attachment +
  // media transient banners) lives inside DashboardSettingsModal so the
  // dashboard shell doesn't re-render every time those panels tick.

  const {
    groupingMode,
    setGroupingMode: handleSetGroupingMode,
    paginatedEntries,
    hasMore,
    loadMore,
    groupedEntries,
    groupKeys,
    isListView,
  } = useDashboardGroupedEntries({
    filteredEntries,
    pageSize: PAGE_SIZE,
    language,
    t,
    selectedTag,
    selectedCategory,
  });

  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  const {
    dynamicVersion,
    handleExport,
    handleDownloadNotes,
    exportTarget,
    setExportTarget,
    isExportDropdownOpen,
    setIsExportDropdownOpen,
  } = useDashboardExport({
    entries,
    filteredEntries,
    currentUser,
    t,
    recordBackup,
  });
  const dropdownRef = useClickOutside<HTMLDivElement>(isExportDropdownOpen, () =>
    setIsExportDropdownOpen(false),
  );

  const importConfirm = useDashboardImportConfirm();

  const {
    inputRef: importInputRef,
    handleChange: handleImportBackup,
    status: importStatus,
  } = useBackupImport({
    onImportBackup,
    t,
    confirm: importConfirm.confirm,
    reportError: (error) => {
      console.error('Backup import failed', error);
    },
  });

  // `isEditingStars` is owned by DashboardSettingsModal but FilterBar
  // also wants to know whether the user is currently mid-edit (to dim
  // affordances). Until we split FilterBar to consume it from a context,
  // we surface a write-through flag here that both sides can read.
  const [isEditingStars, setIsEditingStars] = useState(false);

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
        pending={importConfirm.pending}
        theme={theme}
        t={t}
        onResolve={importConfirm.resolveConfirm}
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

      <DashboardSettingsModal
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        theme={theme}
        onSetTheme={onSetTheme}
        language={language}
        onSetLanguage={onSetLanguage}
        t={t}
        customIdentity={customIdentity}
        setCustomIdentity={setCustomIdentity}
        dynamicVersion={dynamicVersion}
        passwordHash={passwordHash}
        passwordSalt={passwordSalt}
        isUnlocked={isUnlocked}
        onSetPassword={onSetPassword}
        entries={entries}
        activeEntries={activeEntries}
        onBulkUpdateEntries={onBulkUpdateEntries}
        onWipeData={onWipeData}
        onCreateMaterialEntry={onCreateMaterialEntry}
        guidingStars={guidingStars}
        selectedStars={selectedStars}
        onSaveGuidingStars={onSaveGuidingStars}
        onSaveSelectedStars={onSaveSelectedStars}
        isScanning={isScanning}
        scanProgress={scanProgress}
        onTriggerScan={onTriggerScan}
        lastScanSummary={lastScanSummary}
        handleExport={handleExport}
        dropdownRef={dropdownRef}
        isExportDropdownOpen={isExportDropdownOpen}
        setIsExportDropdownOpen={setIsExportDropdownOpen}
        exportTarget={exportTarget}
        setExportTarget={setExportTarget}
        handleDownloadNotes={handleDownloadNotes}
        importInputRef={importInputRef}
        handleImportBackup={onImportBackup ? handleImportBackup : undefined}
        importStatus={importStatus}
        handleGoHomeClick={handleGoHomeClick}
        isSailingHome={isSailingHome}
        setIsFullscreen={setIsFullscreen}
        onEditingStarsChange={setIsEditingStars}
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
        onLoadMore={loadMore}
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
