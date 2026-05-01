import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, Grid, List, Plus, Archive, Settings, LogOut, ChevronDown, Tag, Trash2, Calendar, Clock, Lock, Unlock, Eye, EyeOff, Shield, Sparkles, MessageSquare, Info, AlertTriangle, AlertCircle, CheckCircle2, ChevronLeft, ArrowLeft, ArrowRight, Save, Download, Upload, RefreshCw, X, Menu, MoreVertical, ExternalLink, Moon, Sun, Anchor } from 'lucide-react';
import { DiaryEntry, GroupingMode, Language, Theme, Attachment, Container } from '../types';
import { useSearch } from '../hooks/useSearch';
import { useTransientState } from '../hooks/useTransientState';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { TRANSLATIONS, GUIDING_STAR_DEFAULTS } from '../constants';
import { AppStorageKeys } from '../services/appSettings';
import { getStoredString, hasStoredValue, setStoredString } from '../services/browserStorage';
import { downloadTextFile } from '../services/fileDownload';
import { SecurityService } from '../services/securityService';
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
    onTriggerScan?: () => Promise<void>;
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
  loading
}) => {
  const [now, setNow] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const { scheduleTimeout } = useTimeoutManager();
  const PAGE_SIZE = 50;
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const t = TRANSLATIONS[language];
  
  const [customIdentity, setCustomIdentity] = useState(() => getStoredString(AppStorageKeys.customIdentity) || currentUser || '');

  useEffect(() => {
    setStoredString(AppStorageKeys.customIdentity, customIdentity);
  }, [customIdentity]);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  
  // Go Home Animation State
  const [isSailingHome, setIsSailingHome] = useState(false);

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
  const [isVaultOpen, setIsVaultOpen] = useState(() => {
    const saved = getStoredString(AppStorageKeys.vaultUnlocked);
    return saved === 'true' && isUnlocked;
  });
  
  const [isVerifyingVault, setIsVerifyingVault] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultError, setVaultError] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      setIsVaultOpen(false);
      setStoredString(AppStorageKeys.vaultUnlocked, 'false');
    }
  }, [isUnlocked]);

  const handleToggleVault = async () => {
    if (isVaultOpen) {
      setIsVaultOpen(false);
      setStoredString(AppStorageKeys.vaultUnlocked, 'false');
    } else {
      if (isUnlocked) {
        // If already session-unlocked, just open
        setIsVaultOpen(true);
        setStoredString(AppStorageKeys.vaultUnlocked, 'true');
      } else {
        // Should not happen if in Dashboard, but for safety
        setIsVerifyingVault(true);
      }
    }
  };

  const handleVaultUnlock = async () => {
    if (!vaultPassword) return;
    
    try {
      const isValid = await SecurityService.verifyPassword(vaultPassword, passwordSalt || '', passwordHash);
      if (isValid) {
        setIsVaultOpen(true);
        setStoredString(AppStorageKeys.vaultUnlocked, 'true');
        setIsVerifyingVault(false);
        setVaultPassword('');
        setVaultError(false);
        // Also update parent state if possible
        onSetPassword(vaultPassword); 
      } else {
        setVaultError(true);
        scheduleTimeout(() => setVaultError(false), 2000);
      }
    } catch (e) {
      setVaultError(true);
      scheduleTimeout(() => setVaultError(false), 2000);
    }
  };

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

  // Security State
  const [securityMode, setSecurityMode] = useState<'idle' | 'setup' | 'confirm'>('idle');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const {
    value: securityError,
    setValue: setSecurityError,
    showValue: showSecurityError,
  } = useTransientState<string | null>(null);
  const {
    value: securitySuccess,
    setValue: setSecuritySuccess,
    showValue: showSecuritySuccess,
  } = useTransientState<string | null>(null);

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
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 100MB for Base64 storage safety
    if (file.size > 100 * 1024 * 1024) {
      showMediaError(t.fileTooLarge);
      if (mediaInputRef.current) mediaInputRef.current.value = ''; // Reset input
      return;
    }

    setIsUploading(true);
    setMediaError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        let type: Attachment['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type === 'application/pdf') type = 'pdf';

        setStagedMaterial({
          type,
          data: base64,
          name: file.name,
          mimeType: file.type
        });
        setIsUploading(false);
        if (mediaInputRef.current) mediaInputRef.current.value = ''; // Reset input
      };
      reader.onerror = () => {
        showMediaError(t.uploadError);
        setIsUploading(false);
        if (mediaInputRef.current) mediaInputRef.current.value = ''; // Reset input
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showMediaError(t.uploadError);
      setIsUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = ''; // Reset input
    }
  };

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

  useEffect(() => {
    if (!showSettings) {
      setIsEditingStars(false);
      const defaults = GUIDING_STAR_DEFAULTS[language] || [];
      setTempDirectory(Array.from(new Set([...guidingStars, ...defaults])));
      setTempSelected(selectedStars);
    }
  }, [showSettings, guidingStars, selectedStars]);

  const [selectedNoteId, setSelectedNoteId] = useState<string>('all');
  const [isEditingStars, setIsEditingStars] = useState(false);
  const [tempDirectory, setTempDirectory] = useState<string[]>(() => {
    const defaults = GUIDING_STAR_DEFAULTS[language] || [];
    return Array.from(new Set([...guidingStars, ...defaults]));
  });
  const [tempSelected, setTempSelected] = useState<string[]>(selectedStars);
  const [customStarName, setCustomStarName] = useState('');

  const toggleTempStar = (star: string) => {
    if (tempSelected.includes(star)) {
      setTempSelected(tempSelected.filter(s => s !== star));
    } else if (tempSelected.length < 3) {
      setTempSelected([...tempSelected, star]);
    } else {
      showSecurityError(t.guidingStarsLimit);
    }
  };

  const handleDeleteCustomStar = (star: string) => {
    setTempDirectory(tempDirectory.filter(s => s !== star));
    setTempSelected(tempSelected.filter(s => s !== star));
  };

  const handleSaveStars = () => {
    onSaveGuidingStars(tempDirectory);
    onSaveSelectedStars(tempSelected);
    setIsEditingStars(false);
  };

  const handleAddCustomStar = () => {
    const trimmed = customStarName.trim();
    if (!trimmed) return;
    
    // Add to directory if not already there
    let newDirectory = tempDirectory;
    if (!tempDirectory.includes(trimmed)) {
      newDirectory = [...tempDirectory, trimmed];
      setTempDirectory(newDirectory);
    }
    
    // Auto-select if space available
    if (!tempSelected.includes(trimmed)) {
      if (tempSelected.length < 3) {
        setTempSelected([...tempSelected, trimmed]);
      } else {
        showSecurityError(t.guidingStarsLimit);
      }
    }
    
    setCustomStarName('');
  };

  // Update current time every second to for live countdown removed
  
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(e => console.error(e));
      }
    }
  };

  const getDynamicVersion = () => {
    const years = new Set(entries.map(e => new Date(e.createdAt).getFullYear()));
    const yearCount = Math.max(1, years.size);
    const totalEntries = entries.length;
    const deepArchiveCount = entries.filter(e => e.isArchived).length;
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

  const handleSecuritySetup = async () => {
    const validatePassword = (pass: string) => {
      const hasUppercase = /[A-Z]/.test(pass);
      const hasLowercase = /[a-z]/.test(pass);
      const hasNumber = /[0-9]/.test(pass);
      const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
      return pass.length >= 8 && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    };

    // If changing password, verify old one
    if (passwordHash) {
      const oldPasswordValid = await SecurityService.verifyPassword(oldPassword, passwordSalt || '', passwordHash);
      if (!oldPasswordValid) {
        setSecurityError(t.passwordVerifyFailed);
        return;
      }
    }

    if (!validatePassword(newPassword)) {
      setSecurityError(t.passwordRequirement);
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError(t.passwordMismatch);
      return;
    }

    setIsFullscreen(true); // Use as a temporary locking state or overlay
    setSecuritySuccess("RE-ENCRYPTING DATA...");

    try {
      if (!hasStoredValue(AppStorageKeys.recoveryVerifier)) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const random = new Uint8Array(32);
        window.crypto.getRandomValues(random);
        let generatedRecoveryKey = '';
        for (let i = 0; i < 32; i++) {
          if (i > 0 && i % 8 === 0) generatedRecoveryKey += '-';
          generatedRecoveryKey += chars.charAt(random[i] % chars.length);
        }
        SecurityService.wipeSensitive(random);
        setStoredString(AppStorageKeys.recoveryVerifier, await SecurityService.hashRecoveryKey(generatedRecoveryKey));
      }

      // RE-ENCRYPTION LOGIC: Maintain global consistency
      if (passwordHash) {
        const updatedEntries: DiaryEntry[] = [];
        let failCount = 0;
        
        for (const entry of entries) {
          if (entry.isEncrypted) {
            try {
              // 1. Decrypt with old password
              const plainText = await SecurityService.decrypt(entry.content, oldPassword);
              // 2. Re-encrypt with new password
              const newEncrypted = await SecurityService.encrypt(plainText, newPassword);
              // 3. Mark for update
              updatedEntries.push({ ...entry, content: newEncrypted });
            } catch (e) {
              console.error(`Failed to re-encrypt entry ${entry.id}`, e);
              failCount++;
            }
          }
        }
        
        if (failCount > 0) {
          const proceed = window.confirm(`WARNING: ${failCount} entries could not be decrypted with your current password. Changing the master password now will lock these entries permanently with the old keys. Continue?`);
          if (!proceed) {
             setIsFullscreen(false);
             setSecuritySuccess(null);
             return;
          }
        }

        if (updatedEntries.length > 0) {
          onBulkUpdateEntries(updatedEntries);
        }
      }

      onSetPassword(newPassword);
      setSecurityMode('idle');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityError(null);
      showSecuritySuccess(t.passwordChangeSuccess);
    } catch (e) {
      setSecurityError("CRITICAL: DATA RE-ENCRYPTION FAILED.");
    } finally {
      setIsFullscreen(false);
    }
  };

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
      />

       {/* Vault Unlock Overlay Modal */}
      <AnimatePresence>
        {isVerifyingVault && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`w-full max-w-sm p-8 border ${theme === 'light' ? 'bg-white border-slate-200 shadow-2xl' : 'bg-black border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)]'}`}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full border border-dashed border-cyan-500/40 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-cyan-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-mono font-bold tracking-widest text-cyan-500 uppercase">{t.masterLock}</h3>
                  <p className="text-[10px] font-mono text-cyan-800 uppercase tracking-widest mt-1 opacity-60">VAULT ACCESS RESTRICTED</p>
                </div>
                
                <div className="w-full relative">
                  <input 
                    autoFocus
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVaultUnlock()}
                    placeholder="▪ ▪ ▪ ▪ ▪ ▪"
                    className={`w-full bg-transparent border-b p-4 text-center text-xl tracking-[0.5em] focus:outline-none transition-colors ${vaultError ? 'border-[#C85F72] text-[#C85F72] neon-border-alert' : 'border-cyan-900 focus:border-cyan-500 text-cyan-400'}`}
                  />
                  {vaultError && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-mono text-[#C85F72] uppercase font-bold neon-glow-alert"
                    >
                      {t.passwordMismatch}
                    </motion.p>
                  )}
                </div>

                <div className="flex gap-3 w-full pt-4">
                  <button 
                    onClick={() => { setIsVerifyingVault(false); setVaultPassword(''); setVaultError(false); }}
                    className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-widest border transition-colors ${theme === 'light' ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-cyan-900 text-cyan-800 hover:bg-cyan-950/30'}`}
                  >
                    {language === 'zh' ? '取消' : 'CANCEL'}
                  </button>
                  <button 
                    onClick={handleVaultUnlock}
                    className="flex-1 py-3 text-[10px] font-mono uppercase tracking-widest bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors"
                  >
                    {t.open || '解锁'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        oldPassword={oldPassword} setOldPassword={setOldPassword}
        newPassword={newPassword} setNewPassword={setNewPassword}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
        securityError={securityError} securitySuccess={securitySuccess}
        handleSecuritySetup={handleSecuritySetup}
        isEditingStars={isEditingStars} setIsEditingStars={setIsEditingStars}
        tempDirectory={tempDirectory} tempSelected={tempSelected}
        customStarName={customStarName} setCustomStarName={setCustomStarName}
        toggleTempStar={toggleTempStar} handleDeleteCustomStar={handleDeleteCustomStar}
        handleAddCustomStar={handleAddCustomStar} handleSaveStars={handleSaveStars}
        selectedStars={selectedStars}
        mediaInputRef={mediaInputRef} handleMediaUpload={handleMediaUpload}
        isUploading={isUploading} stagedMaterial={stagedMaterial} setStagedMaterial={setStagedMaterial}
        onCreateMaterialEntry={onCreateMaterialEntry} setMediaSuccess={(message) => {
          if (message === null) {
            setMediaSuccess(null);
            return;
          }
          showMediaSuccess(message);
        }}
        mediaError={mediaError} mediaSuccess={mediaSuccess}
        activeEntries={activeEntries} handleExport={handleExport}
        dropdownRef={dropdownRef} isExportDropdownOpen={isExportDropdownOpen}
        setIsExportDropdownOpen={setIsExportDropdownOpen} exportTarget={exportTarget}
        setExportTarget={setExportTarget} handleDownloadNotes={handleDownloadNotes} entries={entries}
        wipeInput={wipeInput} setWipeInput={setWipeInput} handleWipeConfirm={handleWipeConfirm} setWipeMode={setWipeMode}
        handleGoHomeClick={handleGoHomeClick} isSailingHome={isSailingHome}
        isScanning={isScanning}
        scanProgress={scanProgress}
        onTriggerScan={onTriggerScan}
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
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-700">加载时空记录...</p>
          </div>
        ) : isVaultOpen ? (
          <div>
            <VaultListView 
              entries={groupingMode === 'none' ? paginatedEntries : filteredEntries}
              language={language}
              theme={theme}
              now={now}
              onSelectEntry={onSelectEntry}
              groupingMode={groupingMode}
              groupedEntries={groupedEntries}
              groupKeys={groupKeys}
            />
            {groupingMode === 'none' && hasMore && (
              <div className="flex justify-center py-8">
                 <button 
                   onClick={() => setCurrentPage(prev => prev + 1)}
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
              now={now}
              onSelectEntry={onSelectEntry}
              showFilterHub={showFilterHub}
              setShowFilterHub={setShowFilterHub}
              customIdentity={customIdentity}
              currentUser={currentUser}
            />
            {groupingMode === 'none' && hasMore && (
              <div className="flex justify-center py-8">
                 <button 
                   onClick={() => setCurrentPage(prev => prev + 1)}
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
      <div className={`relative z-10 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center group border mt-auto backdrop-blur-md transition-all duration-1000 ${theme === 'light' ? 'border-slate-200/40 bg-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.03)]' : 'border-cyan-900/20 bg-black/40'}`}>
         {/* Background Pattern */}
         <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${theme === 'light' ? 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[size:20px_20px]' : 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[size:40px_40px]'}`}></div>
         <div className={`absolute inset-0 pointer-events-none ${theme === 'light' ? 'bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent' : 'bg-gradient-to-t from-cyan-900/10 to-transparent'}`}></div>

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
                  <GeometricBoat className={`w-10 h-10 ${theme === 'light' ? 'text-slate-700' : 'text-slate-100'} relative z-10 transition-colors duration-500`} theme={theme} />
                  <div className={`absolute inset-0 blur-md ${theme === 'light' ? 'bg-cyan-200/50' : 'bg-cyan-500/30'}`}></div>
                </div>
             </div>
             <h3 className={`text-xl md:text-2xl font-light tracking-[0.2em] mb-2 transition-colors duration-700 ${theme === 'light' ? 'text-slate-600 group-hover:text-slate-900' : 'text-cyan-200/80 group-hover:text-cyan-100'}`}>
               {t.quote}
             </h3>
             <p className={`text-[10px] font-mono tracking-[0.4em] uppercase ${theme === 'light' ? 'text-slate-300' : 'text-cyan-500/40'}`}>
                {t.quoteSub}
             </p>
         </div>
      </div>
    </div>
  );
};
