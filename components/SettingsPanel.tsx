import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  ArrowLeft,
  Star,
  Database,
  FileText,
  Video,
  Music,
  CheckCircle,
  AlertCircle,
  Anchor,
  RefreshCcw,
} from 'lucide-react';
import { Language, Theme, DiaryEntry, Attachment } from '../types';
import { TRANSLATIONS } from '../constants';
import { AppStorageKeys } from '../services/appSettings';
import { hasStoredValue } from '../services/browserStorage';
import { CyberButton } from './CyberButton';
import { StatisticsWidget } from './StatisticsWidget';

interface SettingsPanelProps {
  theme: Theme;
  language: Language;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  isViewingRecovery: boolean;
  setIsViewingRecovery: (v: boolean) => void;
  securityMode: 'idle' | 'setup' | 'confirm';
  setSecurityMode: (mode: 'idle' | 'setup' | 'confirm') => void;
  passwordHash: string | null;
  customIdentity: string;
  setCustomIdentity: (ident: string) => void;
  dynamicVersion: string;
  isUnlocked: boolean;
  onSetTheme: (theme: Theme) => void;
  onSetLanguage: (lang: Language) => void;

  // Security Setup
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  securityError: string | null;
  securitySuccess: string | null;
  handleSecuritySetup: () => void;

  // Stars
  isEditingStars: boolean;
  setIsEditingStars: (v: boolean) => void;
  tempDirectory: string[];
  tempSelected: string[];
  customStarName: string;
  setCustomStarName: (v: string) => void;
  toggleTempStar: (s: string) => void;
  handleDeleteCustomStar: (s: string) => void;
  handleAddCustomStar: () => void;
  handleSaveStars: () => void;
  selectedStars: string[];

  // Storage
  mediaInputRef: React.RefObject<HTMLInputElement>;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  stagedMaterial: Attachment | null;
  setStagedMaterial: (a: Attachment | null) => void;
  onCreateMaterialEntry: (a: Attachment, isArchived: boolean) => void;
  setMediaSuccess: (m: string | null) => void;
  mediaError: string | null;
  mediaSuccess: string | null;

  // Export
  activeEntries: DiaryEntry[];
  handleExport: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  isExportDropdownOpen: boolean;
  setIsExportDropdownOpen: (v: boolean) => void;
  exportTarget: string;
  setExportTarget: (t: string) => void;
  handleDownloadNotes: (mode: string) => void;
  entries: DiaryEntry[];

  // Import
  importInputRef?: React.RefObject<HTMLInputElement>;
  handleImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importStatus?: { kind: 'success' | 'error'; message: string } | null;

  // Wipe
  wipeInput: string;
  setWipeInput: (v: string) => void;
  handleWipeConfirm: () => void;
  setWipeMode: (v: boolean) => void;

  // Footer quote
  handleGoHomeClick: () => void;
  isSailingHome: boolean;

  // Scanning
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
}

export const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
  const {
    theme,
    language,
    showSettings,
    setShowSettings,
    isViewingRecovery,
    setIsViewingRecovery,
    securityMode,
    setSecurityMode,
    passwordHash,
    customIdentity,
    setCustomIdentity,
    dynamicVersion,
    isUnlocked,
    onSetTheme,
    onSetLanguage,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    securityError,
    securitySuccess,
    handleSecuritySetup,
    isEditingStars,
    setIsEditingStars,
    tempDirectory,
    tempSelected,
    customStarName,
    setCustomStarName,
    toggleTempStar,
    handleDeleteCustomStar,
    handleAddCustomStar,
    handleSaveStars,
    selectedStars,
    mediaInputRef,
    handleMediaUpload,
    isUploading,
    stagedMaterial,
    setStagedMaterial,
    onCreateMaterialEntry,
    setMediaSuccess,
    mediaError,
    mediaSuccess,
    activeEntries,
    handleExport,
    dropdownRef,
    isExportDropdownOpen,
    setIsExportDropdownOpen,
    exportTarget,
    setExportTarget,
    handleDownloadNotes,
    entries,
    wipeInput,
    setWipeInput,
    handleWipeConfirm,
    setWipeMode,
    isScanning,
    scanProgress,
    onTriggerScan,
  } = props;

  const t = TRANSLATIONS[language];

  if (!showSettings) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300 p-4 ${theme === 'light' ? 'bg-[#1a202c]/20' : 'bg-black/90'}`}
    >
      <div
        className={`border w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[92vh] rounded-2xl md:rounded-[24px] ${theme === 'light' ? 'bg-[#fcfdfe] border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-[#0a0f14] border-cyan-950/50 shadow-2xl'}`}
      >
        <div
          className={`flex justify-between items-center p-4 sm:p-6 border-b shrink-0 ${theme === 'light' ? 'border-slate-100' : 'border-cyan-900/20'}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950/30 text-cyan-400'}`}
            >
              <Anchor className="w-5 h-5" />
            </div>
            <h3
              className={`text-xl font-bold tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
            >
              {t.navigationLog}
            </h3>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className={`${theme === 'light' ? 'text-slate-300 hover:text-slate-600' : 'text-cyan-900 hover:text-cyan-400'} transition-all hover:rotate-90 duration-300`}
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
          <input
            type="file"
            ref={mediaInputRef}
            className="hidden"
            onChange={handleMediaUpload}
            accept="image/*,video/*,audio/*,application/pdf"
          />

          {isViewingRecovery ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setIsViewingRecovery(false)}
                  className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-cyan-950/30 text-cyan-800'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h4
                  className={`text-lg font-bold ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                >
                  {t.emergencyAnchor}
                </h4>
              </div>
              <div
                className={`p-6 rounded-2xl border space-y-6 ${theme === 'light' ? 'bg-white/80 border-cyan-100/50' : 'bg-black/40 border-cyan-900/20'}`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950/30 text-cyan-400'}`}
                  >
                    <Anchor className="w-8 h-8" />
                  </div>
                  <div>
                    <h5
                      className={`text-sm font-bold mb-1 ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                    >
                      {t.recoveryKeyTitle}
                    </h5>
                    <p
                      className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-cyan-700'}`}
                    >
                      {t.recoveryKeyDesc}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-6 border-2 border-dashed font-mono text-center rounded-xl relative ${theme === 'light' ? 'bg-slate-50 border-cyan-200 text-cyan-900' : 'bg-cyan-950/20 border-cyan-900 text-cyan-400'}`}
                >
                  <div className="text-sm md:text-base tracking-[0.2em] font-bold break-all select-all py-2">
                    {hasStoredValue(AppStorageKeys.recoveryVerifier)
                      ? language === 'zh'
                        ? '已安全保存校验指纹'
                        : 'RECOVERY VERIFIER STORED'
                      : language === 'zh'
                        ? '尚未生成凭证'
                        : 'NOT_GENERATED'}
                  </div>
                </div>

                <div
                  className={`p-4 text-[10px] font-mono leading-relaxed flex gap-2 rounded-xl ${theme === 'light' ? 'bg-rose-50 text-rose-800 border border-rose-100' : 'bg-rose-950/20 text-rose-500/80 border border-rose-900/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t.recoveryKeyWarning}
                </div>

                <CyberButton
                  onClick={() => setIsViewingRecovery(false)}
                  className="w-full py-4 text-sm font-bold"
                  theme={theme}
                >
                  {t.backToConsole}
                </CyberButton>
              </div>
            </div>
          ) : securityMode !== 'idle' ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => setSecurityMode('idle')}
                  className={`p-2 rounded-full ${theme === 'light' ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-cyan-950/30 text-cyan-800'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h4
                  className={`text-lg font-bold ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                >
                  {t.securityCalibration}
                </h4>
              </div>
              <div
                className={`p-6 rounded-2xl border space-y-6 ${theme === 'light' ? 'bg-white/80 border-cyan-100/50' : 'bg-black/40 border-cyan-900/20'}`}
              >
                {passwordHash && (
                  <div className="space-y-2">
                    <label
                      className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                    >
                      {t.oldPassword}
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 focus:border-cyan-400' : 'bg-black/80 border-cyan-900/30 focus:border-cyan-500 text-cyan-400'}`}
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                    >
                      {t.newPassword}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 focus:border-cyan-400' : 'bg-black/80 border-cyan-900/30 focus:border-cyan-500 text-cyan-400'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                    >
                      {t.confirmPassword}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 focus:border-cyan-400' : 'bg-black/80 border-cyan-900/30 focus:border-cyan-500 text-cyan-400'}`}
                    />
                  </div>
                </div>
                {securityError && (
                  <div className="text-[10px] font-mono text-rose-500 uppercase bg-rose-500/5 p-3 border border-rose-500/20 rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                    {securityError}
                  </div>
                )}
                {securitySuccess && (
                  <div className="text-[10px] font-mono text-green-500 uppercase bg-green-500/5 p-3 border border-green-500/20 rounded-lg">
                    {securitySuccess}
                  </div>
                )}
                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() => setSecurityMode('idle')}
                    className={`flex-1 py-4 font-bold text-sm border rounded-xl transition-all ${theme === 'light' ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-transparent border-cyan-900/20 text-cyan-800 hover:border-cyan-500/30 hover:text-cyan-600'}`}
                  >
                    {t.cancel}
                  </button>
                  <CyberButton
                    onClick={handleSecuritySetup}
                    className="flex-1 py-4 text-sm font-bold shadow-lg shadow-cyan-500/20"
                    theme={theme}
                  >
                    {passwordHash ? t.update : t.save}
                  </CyberButton>
                </div>
                <div
                  className={`p-4 rounded-xl border text-[10px] leading-relaxed ${theme === 'light' ? 'bg-cyan-50 border-cyan-100 text-cyan-800' : 'bg-cyan-950/20 border-cyan-900/30 text-cyan-600 font-mono'}`}
                >
                  {t.passwordRequirement}
                </div>
              </div>
            </div>
          ) : (
            <>
              <StatisticsWidget
                theme={theme}
                language={language}
                onSetLanguage={onSetLanguage}
                customIdentity={customIdentity}
                setCustomIdentity={setCustomIdentity}
                dynamicVersion={dynamicVersion}
                isUnlocked={isUnlocked}
                onSetTheme={onSetTheme}
                setSecurityMode={setSecurityMode}
                setIsViewingRecovery={setIsViewingRecovery}
                passwordHash={passwordHash}
              />

              <div
                className={`rounded-2xl border p-6 space-y-4 transition-all ${theme === 'light' ? 'bg-white/80 border-slate-100 shadow-sm' : 'bg-black/40 border-cyan-900/20'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950/50 text-cyan-400'}`}
                    >
                      <Star className="w-5 h-5" />
                    </span>
                    <div className="flex flex-col">
                      <h4
                        className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-200'}`}
                      >
                        {t.guidingStarsCatalog}
                      </h4>
                      {isEditingStars && (
                        <span
                          className={`text-[10px] font-mono ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                        >
                          {t.guidingStarsLimit}
                        </span>
                      )}
                    </div>
                  </div>
                  {isEditingStars ? (
                    <span
                      className={`text-xs font-mono px-3 py-1 rounded-full border transition-all ${tempSelected.length === 3 ? (theme === 'light' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-green-500/20 border-green-500 text-green-400') : theme === 'light' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}
                    >
                      {tempSelected.length} / 3
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsEditingStars(true)}
                      className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${theme === 'light' ? 'border-cyan-100 text-cyan-600 hover:bg-cyan-50' : 'border-cyan-900/30 text-cyan-400 hover:border-cyan-500/50'}`}
                    >
                      {t.edit}
                    </button>
                  )}
                </div>

                {isEditingStars ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-wrap gap-2">
                      {tempDirectory.map((star) => (
                        <div
                          key={star}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${tempSelected.includes(star) ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 text-cyan-700' : 'bg-cyan-500/20 border-cyan-500 text-cyan-100') : theme === 'light' ? 'bg-white border-slate-200 text-slate-500' : 'bg-transparent border-cyan-900/30 text-cyan-800'}`}
                        >
                          <span onClick={() => toggleTempStar(star)} className="cursor-pointer">
                            {star}
                          </span>
                          {star !== 'ALL' && (
                            <button
                              onClick={() => handleDeleteCustomStar(star)}
                              className="opacity-40 hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customStarName}
                        onChange={(e) => setCustomStarName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStar()}
                        placeholder={t.defineYourself + '...'}
                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-mono border outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 focus:border-cyan-400' : 'bg-black/40 border-cyan-900/30 focus:border-cyan-500 text-cyan-400'}`}
                      />
                      <CyberButton
                        onClick={handleAddCustomStar}
                        theme={theme}
                        className="px-4 text-[10px]"
                      >
                        <Plus className="w-3 h-3" />
                      </CyberButton>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setIsEditingStars(false)}
                        className={`text-xs font-bold ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                      >
                        {t.cancel}
                      </button>
                      <CyberButton
                        onClick={handleSaveStars}
                        theme={theme}
                        className="text-[10px] font-bold px-6"
                      >
                        {t.save}
                      </CyberButton>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-4 p-4 rounded-xl border ${theme === 'light' ? 'bg-white border-slate-100 shadow-sm' : 'bg-transparent border-cyan-900/10'}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${theme === 'light' ? 'bg-slate-50 text-slate-400' : 'bg-cyan-950/30 text-cyan-800'}`}
                    >
                      <Star className="w-5 h-5" />
                    </div>
                    <div
                      className={`flex-1 text-sm font-medium ${theme === 'light' ? 'text-slate-700' : 'text-cyan-100'}`}
                    >
                      {selectedStars.join('、') ||
                        (language === 'zh' ? '暂无活跃锚点' : 'No active stars')}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`rounded-2xl border p-6 space-y-6 transition-all ${theme === 'light' ? 'bg-white/80 border-slate-100 shadow-sm' : 'bg-black/40 border-cyan-900/20'}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950/50 text-cyan-400'}`}
                  >
                    <Database className="w-5 h-5" />
                  </span>
                  <h4
                    className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-200'}`}
                  >
                    {t.memAndTracks}
                  </h4>
                </div>

                <button
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full py-4 border rounded-xl flex items-center justify-center gap-3 text-sm font-bold transition-all ${theme === 'light' ? 'bg-white border-cyan-100 text-cyan-600 shadow-sm hover:shadow-md' : 'bg-cyan-950/10 border-cyan-900/30 text-cyan-400'} ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <Plus className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />{' '}
                  {isUploading ? t.isUploading : t.loadSupply}
                </button>

                {stagedMaterial && (
                  <div
                    className={`p-4 rounded-xl border animate-in zoom-in-95 duration-300 ${theme === 'light' ? 'bg-cyan-50/50 border-cyan-100' : 'bg-cyan-950/20 border-cyan-900/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      {stagedMaterial.type === 'image' ? (
                        <img
                          src={stagedMaterial.data}
                          className="w-16 h-16 rounded-lg object-cover border border-cyan-500/20"
                          alt="preview"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-cyan-950/30 flex items-center justify-center text-cyan-400">
                          {stagedMaterial.type === 'video' ? (
                            <Video className="w-8 h-8" />
                          ) : stagedMaterial.type === 'audio' ? (
                            <Music className="w-8 h-8" />
                          ) : (
                            <FileText className="w-8 h-8" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold truncate ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                        >
                          {stagedMaterial.name}
                        </div>
                        <div className="text-[10px] text-cyan-600 font-mono">STAGED_READY</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            onCreateMaterialEntry(stagedMaterial, false);
                            setStagedMaterial(null);
                            setMediaSuccess(t.materialSaved);
                          }}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-bold rounded-lg transition-all"
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={() => setStagedMaterial(null)}
                          className={`text-[10px] font-bold ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {mediaError && (
                  <div className="text-[10px] p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                    {mediaError}
                  </div>
                )}
                {mediaSuccess && (
                  <div className="text-[10px] p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 font-mono">
                    {mediaSuccess}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-1">
                    <Database
                      className={`w-4 h-4 ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-500'}`}
                    />
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-200'}`}
                    >
                      {t.backupTracks}{' '}
                      <span className="opacity-50 ml-1 font-normal">
                        ({activeEntries.length}
                        {t.pendingRecs})
                      </span>
                    </span>
                  </div>

                  <div
                    className={`p-4 rounded-xl border flex flex-col gap-4 ${theme === 'light' ? 'bg-cyan-50/20 border-cyan-100' : 'bg-cyan-950/10 border-cyan-900/30'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <RefreshCcw
                          className={`w-5 h-5 text-cyan-500 ${isScanning ? 'animate-spin' : ''}`}
                        />
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                          >
                            {language === 'zh' ? '数据扫描与修复' : 'Scan & Repair'}
                          </span>
                          <span
                            className={`text-[9px] opacity-60 ${theme === 'light' ? 'text-slate-500' : 'text-cyan-700'}`}
                          >
                            {language === 'zh'
                              ? '重新扫描丢失的历史记录并整合到统一存储'
                              : 'Rescan legacy data and merge into unified vault'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isScanning) return;
                          if (
                            confirm(
                              language === 'zh'
                                ? '这将启动数据深度扫描程序，可能需要几秒钟。确定吗？'
                                : 'This will start a deep data scan, which may take a few seconds. Continue?',
                            )
                          ) {
                            onTriggerScan?.();
                          }
                        }}
                        disabled={isScanning}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${isScanning ? 'opacity-50 cursor-wait border-cyan-900 text-cyan-800' : theme === 'light' ? 'border-cyan-200 text-cyan-600 hover:bg-cyan-100' : 'border-cyan-900 text-cyan-500 hover:border-cyan-400 hover:text-cyan-400'}`}
                      >
                        {isScanning
                          ? language === 'zh'
                            ? '正在扫描'
                            : 'SCANNING'
                          : language === 'zh'
                            ? '执行扫描'
                            : 'EXECUTE'}
                      </button>
                    </div>

                    {isScanning && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-cyan-500">
                          <span>
                            {language === 'zh' ? '正在解析时空节点' : 'Parsing temporal nodes'}...
                          </span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'light' ? 'bg-slate-200' : 'bg-cyan-950'}`}
                        >
                          <motion.div
                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${scanProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}

                    {!isScanning && props.lastScanSummary && (
                      <div
                        role="status"
                        className={`text-[10px] font-mono leading-relaxed flex flex-col gap-1 ${
                          props.lastScanSummary.status === 'success'
                            ? 'text-cyan-500/80'
                            : 'text-rose-500'
                        }`}
                      >
                        {props.lastScanSummary.status === 'success' ? (
                          <span>
                            {(
                              t.scanSummarySuccess ??
                              'Last scan merged {entries} entries · {principles} principles · {containers} containers.'
                            )
                              .replace('{entries}', String(props.lastScanSummary.mergedEntries))
                              .replace(
                                '{principles}',
                                String(props.lastScanSummary.mergedPrinciples),
                              )
                              .replace(
                                '{containers}',
                                String(props.lastScanSummary.mergedContainers),
                              )}
                          </span>
                        ) : (
                          <>
                            <span>
                              {t.scanSummaryFailed ?? 'Last scan failed; data was not modified.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onTriggerScan?.()}
                              className="self-start mt-1 px-2 py-1 rounded border border-rose-500/50 text-rose-500 text-[9px] uppercase tracking-widest hover:bg-rose-500/10"
                            >
                              {t.scanRetry ?? 'Retry scan'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl border transition-all ${theme === 'light' ? 'bg-[#f8fafc]/50 border-slate-100 shadow-sm' : 'bg-cyan-950/5 border-cyan-900/10'}`}
                  >
                    <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-cyan-50 text-cyan-500' : 'bg-cyan-950/30 text-cyan-500'}`}
                        >
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div
                            className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                          >
                            {t.exportStarMap}
                          </div>
                          <div
                            className={`text-[11px] opacity-60 font-medium leading-relaxed max-w-[280px] ${theme === 'light' ? 'text-slate-500' : 'text-cyan-800'}`}
                          >
                            {t.snapshotDesc}
                          </div>
                        </div>
                      </div>
                      <CyberButton
                        onClick={handleExport}
                        variant="ghost"
                        className="w-full sm:w-auto px-6 py-2.5 text-[11px] font-black border-cyan-100 bg-white shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider"
                        theme={theme}
                      >
                        <FileText className="w-4 h-4" />
                        {t.btnExportStarMap}
                      </CyberButton>
                    </div>

                    {props.handleImportBackup && (
                      <>
                        <div
                          className={`h-px w-full ${theme === 'light' ? 'bg-slate-50' : 'bg-cyan-900/10'}`}
                        />
                        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-cyan-50 text-cyan-500' : 'bg-cyan-950/30 text-cyan-500'}`}
                            >
                              <Database className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <div
                                className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                              >
                                {t.importStarMap ?? 'Restore Backup'}
                              </div>
                              <div
                                className={`text-[11px] opacity-60 font-medium leading-relaxed max-w-[280px] ${theme === 'light' ? 'text-slate-500' : 'text-cyan-800'}`}
                              >
                                {t.importStarMapDesc ??
                                  'Merge entries from a previously exported VECTOR backup JSON.'}
                              </div>
                              {props.importStatus && (
                                <div
                                  className={`text-[11px] font-mono ${
                                    props.importStatus.kind === 'success'
                                      ? 'text-cyan-500'
                                      : 'text-rose-500'
                                  }`}
                                  role="status"
                                >
                                  {props.importStatus.message}
                                </div>
                              )}
                            </div>
                          </div>
                          <CyberButton
                            onClick={() => props.importInputRef?.current?.click()}
                            variant="ghost"
                            className="w-full sm:w-auto px-6 py-2.5 text-[11px] font-black border-cyan-100 bg-white shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider"
                            theme={theme}
                          >
                            <Database className="w-4 h-4" />
                            {t.btnImportStarMap ?? 'Import JSON'}
                          </CyberButton>
                          <input
                            ref={props.importInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={props.handleImportBackup}
                          />
                        </div>
                      </>
                    )}

                    <div
                      className={`h-px w-full ${theme === 'light' ? 'bg-slate-50' : 'bg-cyan-900/10'}`}
                    />

                    <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${theme === 'light' ? 'bg-cyan-50 text-cyan-500' : 'bg-cyan-950/30 text-cyan-500'}`}
                        >
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div
                            className={`text-sm font-black uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                          >
                            {t.exportTextLog}
                          </div>
                          <div
                            className={`text-[11px] opacity-60 font-medium leading-relaxed max-w-[280px] ${theme === 'light' ? 'text-slate-500' : 'text-cyan-800'}`}
                          >
                            {t.logDesc}
                          </div>
                        </div>
                      </div>

                      <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                        <CyberButton
                          onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                          variant="ghost"
                          className="w-full sm:w-auto px-6 py-2.5 text-[11px] font-black border-cyan-100 bg-white shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider"
                          theme={theme}
                        >
                          <FileText className="w-4 h-4" />
                          {t.btnExportTextLog}
                        </CyberButton>

                        <AnimatePresence>
                          {isExportDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className={`absolute bottom-full right-0 mb-3 z-50 min-w-[240px] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl ${theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-black/90 border-cyan-900/40'}`}
                            >
                              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                  {t.selectExportTarget}
                                </div>
                                <button
                                  onClick={() => {
                                    setExportTarget('all');
                                    setIsExportDropdownOpen(false);
                                    handleDownloadNotes('all');
                                  }}
                                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between group transition-all ${exportTarget === 'all' ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/5'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText
                                      className={`w-4 h-4 ${exportTarget === 'all' ? 'text-cyan-500' : 'text-cyan-800'}`}
                                    />
                                    <span
                                      className={`text-[11px] font-black uppercase tracking-tight ${exportTarget === 'all' ? 'text-cyan-400' : 'text-cyan-700'}`}
                                    >
                                      {t.exportAll}
                                    </span>
                                  </div>
                                </button>
                                <div
                                  className={`h-px my-2 ${theme === 'light' ? 'bg-slate-100' : 'bg-cyan-900/20'}`}
                                />
                                {entries
                                  .filter((e) => !e.isArchived)
                                  .map((entry) => (
                                    <button
                                      key={entry.id}
                                      onClick={() => {
                                        setExportTarget(entry.id);
                                        setIsExportDropdownOpen(false);
                                        handleDownloadNotes(entry.id);
                                      }}
                                      className={`w-full text-left p-3 rounded-xl flex items-center justify-between group transition-all ${exportTarget === entry.id ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/5'}`}
                                    >
                                      <div className="flex flex-col">
                                        <span
                                          className={`text-[9px] font-mono leading-none mb-1 ${theme === 'light' ? 'text-slate-400' : 'text-cyan-800'}`}
                                        >
                                          {new Date(entry.createdAt).toLocaleDateString()}
                                        </span>
                                        <span
                                          className={`text-[11px] font-bold truncate max-w-[160px] ${exportTarget === entry.id ? 'text-cyan-400' : 'text-cyan-700'}`}
                                        >
                                          {entry.title}
                                        </span>
                                      </div>
                                      {exportTarget === entry.id && (
                                        <CheckCircle className="w-4 h-4 text-cyan-500" />
                                      )}
                                    </button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border transition-all ${theme === 'light' ? 'bg-rose-50/10 border-rose-100/50 shadow-sm' : 'bg-rose-950/5 border-rose-950/20'}`}
                  >
                    <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="text-center md:text-left space-y-1">
                        <h4
                          className={`text-lg font-black tracking-[0.2em] uppercase ${theme === 'light' ? 'text-rose-700' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]'}`}
                        >
                          {t.wipeData}
                        </h4>
                        <div
                          className={`text-[11px] font-medium tracking-wide leading-relaxed flex flex-col gap-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-rose-900/60'}`}
                        >
                          <p>{t.wipeDataDesc}</p>
                          <p>{t.wipePoetic1}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-[150px]">
                          <input
                            type="text"
                            value={wipeInput}
                            onChange={(e) => setWipeInput(e.target.value)}
                            placeholder={t.wipeDataConfirm}
                            className={`w-full bg-transparent border-b py-2 text-center font-mono text-sm tracking-[0.3em] transition-all outline-none ${theme === 'light' ? 'border-rose-100 focus:border-rose-600 text-rose-900 placeholder:text-rose-200' : 'border-rose-900/40 focus:border-rose-500 text-rose-100 placeholder:text-rose-900/20'}`}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            disabled={wipeInput !== 'DELETE'}
                            onClick={handleWipeConfirm}
                            className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${wipeInput === 'DELETE' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95' : 'opacity-20 cursor-not-allowed bg-slate-400'}`}
                          >
                            {t.confirmWipe}
                          </button>
                          <button
                            onClick={() => {
                              setWipeMode(false);
                              setWipeInput('');
                              setShowSettings(false);
                            }}
                            className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all ${theme === 'light' ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-cyan-900/30 text-cyan-800 hover:bg-cyan-950/10'}`}
                          >
                            {t.btnCancel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
