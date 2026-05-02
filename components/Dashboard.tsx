import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
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
import { EntryGrid } from './EntryGrid';
import { SettingsPanel } from './SettingsPanel';
import { GeometricBoat } from './GeometricBoat';
import { VaultListView } from './VaultListView';
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
  const langDropdownRef = useRef<HTMLDivElement>(null);
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };

    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

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

      <div
        onClick={() => !isVaultOpen && handleToggleVault()}
        className={`transition-all duration-700 relative overflow-hidden rounded-2xl border ${
          theme === 'light'
            ? 'bg-white/40 border-slate-200/40 shadow-sm'
            : 'bg-[#0a0d12]/60 border-[#173242]/20 backdrop-blur-md'
        } ${isVaultOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-40 lg:opacity-50 grayscale blur-xl translate-y-4 cursor-pointer hover:opacity-70'}`}
      >
        <AnimatePresence>
          {!isVaultOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm group"
            >
              <div className="p-6 rounded-full border border-cyan-500/20 bg-black/60 shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-500">
                <Lock className="w-10 h-10 text-cyan-500/60 group-hover:text-cyan-400 group-hover:animate-pulse" />
              </div>
              <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-500/60 font-bold group-hover:text-cyan-400">
                {t.encryptedLog} ● {t.clickToUnlock || '点击解锁'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-700">
              加载时空记录...
            </p>
          </div>
        ) : isVaultOpen ? (
          <div>
            <VaultListView
              entries={groupingMode === 'none' ? paginatedEntries : filteredEntries}
              language={language}
              theme={theme}
              onSelectEntry={onSelectEntry}
              groupingMode={groupingMode}
              groupedEntries={groupedEntries}
              groupKeys={groupKeys}
            />
            {groupingMode === 'none' && hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className={`px-8 py-3 rounded-full border font-mono text-[10px] uppercase tracking-[0.4em] transition-all duration-500 hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-500 hover:border-cyan-500 hover:text-cyan-600' : 'bg-black border-cyan-900/40 text-cyan-800 hover:border-cyan-500 hover:text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]'}`}
                >
                  {language === 'zh' ? '加载更多记录' : 'LOAD MORE RECORDS'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <EntryGrid
              theme={theme}
              language={language}
              searchQuery={searchQuery}
              filteredEntries={groupingMode === 'none' ? paginatedEntries : filteredEntries}
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
            {groupingMode === 'none' && hasMore && (
              <div className="flex justify-center py-8">
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className={`px-8 py-3 rounded-full border font-mono text-[10px] uppercase tracking-[0.4em] transition-all duration-500 hover:scale-105 active:scale-95 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-500 hover:border-cyan-500 hover:text-cyan-600' : 'bg-black border-cyan-900/40 text-cyan-800 hover:border-cyan-500 hover:text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]'}`}
                >
                  {language === 'zh' ? '加载更多记录' : 'LOAD MORE RECORDS'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Motivational Footer */}
      <div
        className={`relative z-10 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center group border mt-auto backdrop-blur-md transition-all duration-1000 ${theme === 'light' ? 'border-slate-200/40 bg-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.03)]' : 'border-cyan-900/20 bg-black/40'}`}
      >
        {/* Background Pattern */}
        <div
          className={`absolute inset-0 opacity-[0.03] pointer-events-none ${theme === 'light' ? 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[size:20px_20px]' : 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[size:40px_40px]'}`}
        ></div>
        <div
          className={`absolute inset-0 pointer-events-none ${theme === 'light' ? 'bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent' : 'bg-gradient-to-t from-cyan-900/10 to-transparent'}`}
        ></div>

        <div className="relative z-10 max-w-3xl px-8 text-center flex flex-col items-center">
          <div
            onClick={handleGoHomeClick}
            className={`mb-6 p-4 rounded-full border transition-all cursor-pointer ${
              isSailingHome
                ? 'duration-1000 translate-x-[200px] opacity-0 blur-md scale-75'
                : 'duration-700 hover:scale-110 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            } ${theme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-black/50 border-cyan-900/30'}`}
          >
            <div className="relative">
              <GeometricBoat
                className={`w-10 h-10 ${theme === 'light' ? 'text-slate-700' : 'text-slate-100'} relative z-10 transition-colors duration-500`}
                theme={theme}
              />
              <div
                className={`absolute inset-0 blur-md ${theme === 'light' ? 'bg-cyan-200/50' : 'bg-cyan-500/30'}`}
              ></div>
            </div>
          </div>
          <h3
            className={`text-xl md:text-2xl font-light tracking-[0.2em] mb-2 transition-colors duration-700 ${theme === 'light' ? 'text-slate-600 group-hover:text-slate-900' : 'text-cyan-200/80 group-hover:text-cyan-100'}`}
          >
            {t.quote}
          </h3>
          <p
            className={`text-[10px] font-mono tracking-[0.4em] uppercase ${theme === 'light' ? 'text-slate-300' : 'text-cyan-500/40'}`}
          >
            {t.quoteSub}
          </p>
        </div>
      </div>
    </div>
  );
};
