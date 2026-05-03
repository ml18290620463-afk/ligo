import React, { useEffect, useState, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { AppState, DiaryEntry, Language, Theme } from './types';
import { useDiaryData } from './hooks/useDiaryData';
import { useMotionPreference } from './hooks/useMotionPreference';
import { Dashboard } from './components/Dashboard';
import { CoverScreen } from './components/CoverScreen';
import { MasterLock } from './components/MasterLock';
import { Onboarding } from './components/Onboarding';
import { SpaceTimeBackground } from './components/SpaceTimeBackground';
import { CommandPalette } from './components/CommandPalette';
import { TRANSLATIONS } from './constants';
import { SecurityService } from './services/securityService';
import { useAppStore } from './stores/appStore';
import { ErrorBoundary } from './components/ErrorBoundary';

const Viewer = lazy(() =>
  import('./components/Viewer').then((module) => ({ default: module.Viewer })),
);
const Editor = lazy(() =>
  import('./components/Editor').then((module) => ({ default: module.Editor })),
);
const ArchiveVault = lazy(() =>
  import('./components/ArchiveVault').then((module) => ({ default: module.ArchiveVault })),
);

const ScreenLoader: React.FC<{ language: Language }> = ({ language }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="font-mono text-cyan-500 text-xs tracking-widest animate-pulse uppercase">
        {TRANSLATIONS[language].restoringLink}
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // Subscribe via `useShallow` so changes to unrelated store fields (e.g.
  // a child component flipping `selectedEntry`) do not trigger an App
  // re-render. Without this, the Zustand default reference-equality check
  // re-renders the entire tree on every `set()` call.
  const {
    appState,
    setAppState,
    language,
    setLanguage,
    theme,
    setTheme,
    currentUser,
    userId,
    masterPassword,
    isUnlocked,
    selectedEntry,
    setCurrentUser,
    setMasterPassword,
    setIsUnlocked,
    setSelectedEntry,
  } = useAppStore(
    useShallow((state) => ({
      appState: state.appState,
      setAppState: state.setAppState,
      language: state.language,
      setLanguage: state.setLanguage,
      theme: state.theme,
      setTheme: state.setTheme,
      currentUser: state.currentUser,
      userId: state.userId,
      masterPassword: state.masterPassword,
      isUnlocked: state.isUnlocked,
      selectedEntry: state.selectedEntry,
      setCurrentUser: state.setCurrentUser,
      setMasterPassword: state.setMasterPassword,
      setIsUnlocked: state.setIsUnlocked,
      setSelectedEntry: state.setSelectedEntry,
    })),
  );

  // Update currentUser when language changes
  useEffect(() => {
    setCurrentUser(TRANSLATIONS[language].localUser);
  }, [language, setCurrentUser]);

  // W3.1 — global command palette toggle. Bound to ⌘K / Ctrl+K
  // unconditionally so the shortcut works from every screen (cover,
  // editor, viewer, etc.). The handler stops propagation so it never
  // double-fires when a child surface also wires the same key.
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Data Layer Hook
  const {
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
    importBackup,
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
    containers,
    addContainer,
    deleteContainer,
    loading,
    isScanning,
    scanProgress,
    triggerScan,
    lastScanSummary,
    syncStatus,
  } = useDiaryData(userId, language);

  // Derived Principles for Cover Screen
  const homePrinciples = [
    ...principles.filter((p) => p.showOnHome).map((p) => ({ ...p, sortDate: p.createdAt })),
  ].sort((a, b) => b.sortDate - a.sortDate); // Smart Sorting: Most recent first

  // --- Handlers ---

  const handleStartFromCover = () => {
    if (!loading && !passwordHash) {
      // If no password is set, force onboarding even if they have guiding stars from an incomplete setup
      setAppState(AppState.ONBOARDING);
    } else if (passwordHash && !isUnlocked) {
      setAppState(AppState.DASHBOARD);
    } else {
      setAppState(AppState.DASHBOARD);
    }
  };

  const handleOnboardingComplete = async (
    password: string,
    directory: string[],
    selection: string[],
  ) => {
    // Generate salt
    const saltArray = window.crypto.getRandomValues(new Uint8Array(32));
    const salt = btoa(String.fromCharCode(...saltArray));
    SecurityService.wipeSensitive(saltArray);

    // Hash password
    const hash = await SecurityService.hashPassword(password, salt);

    // Save
    await savePasswordSalt(salt);
    await savePasswordHash(hash);

    await saveGuidingStars(directory);
    await saveSelectedStars(selection);
    setMasterPassword(password);
    setIsUnlocked(true);
    setAppState(AppState.DASHBOARD);
  };

  const handleUnlock = (password: string) => {
    setMasterPassword(password);
    setIsUnlocked(true);
  };

  const handleSetPassword = async (password: string) => {
    // Generate salt
    const saltArray = window.crypto.getRandomValues(new Uint8Array(32));
    const salt = btoa(String.fromCharCode(...saltArray));
    SecurityService.wipeSensitive(saltArray);

    // Hash password
    const hash = await SecurityService.hashPassword(password, salt);

    // Save
    await savePasswordSalt(salt);
    await savePasswordHash(hash);

    setMasterPassword(password);
    setIsUnlocked(true);
  };

  const handleClearPassword = async () => {
    await clearPasswordHash();
    setMasterPassword(null);
    setIsUnlocked(false);
  };

  const handleWipeData = () => {
    setMasterPassword(null);
    setIsUnlocked(false);
    setAppState(AppState.COVER);
    wipeData().catch(console.error);
  };

  const handleSelectEntry = (entry: DiaryEntry) => {
    if (entry.unlockAt && entry.unlockAt > Date.now()) return;
    setSelectedEntry(entry);
    setAppState(AppState.VIEWER);
  };

  const handleSaveEntry = (data: Omit<DiaryEntry, 'id' | 'createdAt' | 'isLocked'>) => {
    addEntry(data);
    setAppState(AppState.DASHBOARD);
  };

  const handleBackToDashboard = () => {
    setAppState(AppState.DASHBOARD);
    setSelectedEntry(null);
  };

  const showGlobalBackground = [
    AppState.DASHBOARD,
    AppState.VIEWER,
    AppState.EDITOR,
    AppState.ARCHIVE,
  ].includes(appState);

  return (
    <ErrorBoundary>
      <AppMotionConfig>
        <div
          className={`min-h-screen font-sans relative transition-colors duration-1000 ${theme === 'light' ? 'bg-[#f0f4f7] text-[#1a202c] selection:bg-[#007a8c]/20 selection:text-[#007a8c]' : 'bg-[#030303] text-gray-100 selection:bg-cyan-500 selection:text-white'}`}
        >
          {showGlobalBackground && <SpaceTimeBackground theme={theme} />}

          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            theme={theme}
            language={language}
            appState={appState}
            t={TRANSLATIONS[language]}
            entries={entries}
            onNewEntry={() => setAppState(AppState.EDITOR)}
            onOpenArchive={() => setAppState(AppState.ARCHIVE)}
            onBackToDashboard={handleBackToDashboard}
            onReplayIntro={() => setAppState(AppState.COVER)}
            onSelectEntry={handleSelectEntry}
            onSetTheme={(t: Theme) => setTheme(t)}
            onSetLanguage={(lang: Language) => setLanguage(lang)}
            onLockVault={passwordHash ? () => setIsUnlocked(false) : undefined}
            onWipeData={passwordHash ? handleWipeData : undefined}
          />

          {loading && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="font-mono text-cyan-500 text-xs tracking-widest animate-pulse uppercase">
                  {TRANSLATIONS[language].restoringLink}
                </div>
              </div>
            </div>
          )}

          {appState === AppState.COVER && (
            <CoverScreen
              onStart={handleStartFromCover}
              language={language}
              principles={homePrinciples}
              theme={theme}
            />
          )}

          {appState === AppState.ONBOARDING && (
            <Onboarding
              language={language}
              onSetLanguage={(lang: Language) => setLanguage(lang)}
              theme={theme}
              onComplete={handleOnboardingComplete}
              onCancel={() => setAppState(AppState.COVER)}
            />
          )}

          {appState === AppState.DASHBOARD &&
            (passwordHash && !isUnlocked ? (
              <MasterLock
                language={language}
                theme={theme}
                onUnlock={handleUnlock}
                onResetPassword={handleSetPassword}
                onCancel={() => setAppState(AppState.COVER)}
                onWipeData={handleWipeData}
                passwordHash={passwordHash}
                passwordSalt={passwordSalt}
              />
            ) : (
              <Dashboard
                entries={entries}
                currentUser={currentUser}
                isGuest={userId === 'guest'}
                language={language}
                onSetLanguage={(lang: Language) => setLanguage(lang)}
                theme={theme}
                onSetTheme={(t: Theme) => setTheme(t)}
                onSelectEntry={handleSelectEntry}
                onUpdateEntry={updateEntry}
                onBulkUpdateEntries={bulkUpdateEntries}
                onNewEntry={() => setAppState(AppState.EDITOR)}
                onOpenArchive={() => setAppState(AppState.ARCHIVE)}
                onReplayIntro={() => setAppState(AppState.COVER)}
                onWipeData={handleWipeData}
                onCreateMaterialEntry={(material, isArchived) => {
                  addEntry({
                    title: material.name,
                    content: `[Attachment: ${material.name}]`,
                    tags: ['upload', 'material', material.type],
                    attachment: material,
                    isArchived,
                  });
                }}
                isUnlocked={isUnlocked}
                passwordHash={passwordHash}
                passwordSalt={passwordSalt}
                onSetPassword={handleSetPassword}
                onClearPassword={handleClearPassword}
                onImportBackup={importBackup}
                guidingStars={guidingStars}
                onSaveGuidingStars={saveGuidingStars}
                selectedStars={selectedStars}
                onSaveSelectedStars={saveSelectedStars}
                containers={containers}
                onAddContainer={addContainer}
                onDeleteContainer={deleteContainer}
                isScanning={isScanning}
                scanProgress={scanProgress}
                onTriggerScan={triggerScan}
                lastScanSummary={lastScanSummary}
                syncStatus={syncStatus}
                loading={loading}
              />
            ))}

          {appState === AppState.VIEWER && selectedEntry && (
            <Suspense fallback={<ScreenLoader language={language} />}>
              <Viewer
                language={language}
                theme={theme}
                entry={selectedEntry}
                currentUser={currentUser}
                masterPassword={masterPassword}
                guidingStars={selectedStars}
                onBack={handleBackToDashboard}
                onGoHome={() => setAppState(AppState.COVER)}
                onUpdateEntry={(entry) => {
                  updateEntry(entry);
                  setSelectedEntry(entry);
                }}
                onDelete={(id) => {
                  deleteEntry(id);
                  handleBackToDashboard();
                }}
                onArchive={(id) => {
                  archiveEntry(id);
                  handleBackToDashboard();
                }}
                onRestore={(id) => {
                  unarchiveEntry(id);
                  handleBackToDashboard();
                }}
                containers={containers}
              />
            </Suspense>
          )}

          {appState === AppState.EDITOR && (
            <Suspense fallback={<ScreenLoader language={language} />}>
              <Editor
                language={language}
                theme={theme}
                masterPassword={masterPassword}
                onSave={handleSaveEntry}
                onCancel={handleBackToDashboard}
                onGoHome={() => setAppState(AppState.COVER)}
                existingTitles={entries.map((e) => e.title)}
              />
            </Suspense>
          )}

          {appState === AppState.ARCHIVE && (
            <Suspense fallback={<ScreenLoader language={language} />}>
              <ArchiveVault
                language={language}
                theme={theme}
                entries={entries}
                principles={principles}
                onAddPrinciple={addPrinciple}
                onDeletePrinciple={deletePrinciple}
                onUpdatePrinciple={updatePrinciple}
                onBack={handleBackToDashboard}
                onGoHome={() => setAppState(AppState.COVER)}
                onSelectEntry={handleSelectEntry}
                containers={containers}
                onAddContainer={addContainer}
                onDeleteContainer={deleteContainer}
              />
            </Suspense>
          )}
        </div>
      </AppMotionConfig>
    </ErrorBoundary>
  );
};

/**
 * Bridges the OS-level `prefers-reduced-motion` setting into every
 * `motion/react` consumer. Setting `transition={{ duration: 0 }}` collapses
 * spring/ease transitions to instant; `reducedMotion="user"` also short-
 * circuits the variants pipeline.
 */
const AppMotionConfig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduce = useMotionPreference();
  return (
    <MotionConfig
      reducedMotion={reduce ? 'always' : 'user'}
      transition={reduce ? { duration: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  );
};

export default App;
