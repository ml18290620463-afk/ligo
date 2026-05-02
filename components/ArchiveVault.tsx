import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNowTick } from '../hooks/useNowTick';
import {
  ArrowLeft,
  Database,
  ChevronDown,
  ChevronRight,
  Binary,
  Book,
  Plus,
  Trash2,
  Shield,
  Star,
  Paperclip,
  Lock,
} from 'lucide-react';
import { Container, DiaryEntry, GroupingMode, Language, Principle, Theme } from '../types';
import { CyberButton } from './CyberButton';
import { TRANSLATIONS } from '../constants';
import { FilterHub } from './FilterHub';
import { useSearch } from '../hooks/useSearch';
import { asLegacyEntry, getEntryTimestamp, isMemoryBoatEntry } from '../services/entryCompat';

interface ArchiveVaultProps {
  language: Language;
  theme?: Theme;
  entries: DiaryEntry[];
  principles: Principle[];
  onAddPrinciple: (text: string, year: number, showOnHome: boolean) => void;
  onDeletePrinciple: (id: string) => void;
  onUpdatePrinciple: (principle: Principle) => void;
  onBack: () => void;
  onGoHome?: () => void;
  onSelectEntry: (entry: DiaryEntry) => void;
  containers: Container[];
  onAddContainer: (name: string) => void;
  onDeleteContainer: (id: string) => void;
}

type ArchiveGroupingMode = Exclude<GroupingMode, 'none'>;

export const ArchiveVault: React.FC<ArchiveVaultProps> = ({
  language,
  theme = 'dark',
  entries,
  principles,
  onAddPrinciple,
  onDeletePrinciple,
  onUpdatePrinciple,
  onBack,
  onGoHome,
  onSelectEntry,
  containers,
  onAddContainer,
  onDeleteContainer,
}) => {
  const t = TRANSLATIONS[language];
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const hasPendingTimeLock = useMemo(
    () =>
      entries.some((entry) => typeof entry.unlockAt === 'number' && entry.unlockAt > Date.now()),
    [entries],
  );
  const now = useNowTick(hasPendingTimeLock);
  const [groupingMode, setGroupingMode] = useState<ArchiveGroupingMode>('year');
  const [view, setView] = useState<'vault' | 'principles'>('vault');
  const [newPrincipleText, setNewPrincipleText] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showOnHome, setShowOnHome] = useState(true);
  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Filter Hub State
  const [showFilterHub, setShowFilterHub] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'uncategorized' | string>('all');

  const archivedEntriesBase = useMemo(() => {
    // Memory Boat = All entries that are explicitly archived or located in memory boat
    // User requested filter logic: item.inMemoryBoat === true || item.archived === true || item.location === "memoryBoat"
    return entries
      .filter((entry) => isMemoryBoatEntry(asLegacyEntry(entry)))
      .sort((a, b) => {
        const timeA = getEntryTimestamp(asLegacyEntry(a));
        const timeB = getEntryTimestamp(asLegacyEntry(b));
        return timeB - timeA;
      });
  }, [entries]);

  // Apply Category and Tag filters
  const baseFilteredEntries = useMemo(() => {
    let result = archivedEntriesBase;
    if (selectedCategory === 'uncategorized') {
      result = result.filter((e) => !e.containerId);
    } else if (selectedCategory !== 'all') {
      result = result.filter((e) => e.containerId === selectedCategory);
    }

    if (selectedTag) {
      result = result.filter((e) => e.tags.includes(selectedTag));
    }
    return result;
  }, [archivedEntriesBase, selectedCategory, selectedTag]);

  const archivedEntries = useSearch(baseFilteredEntries, searchQuery);

  // Dynamic Grouping logic
  const groupedEntries = useMemo(() => {
    const groups: Record<string, DiaryEntry[]> = {};
    archivedEntries.forEach((entry) => {
      const date = new Date(entry.createdAt);
      let key = '';
      if (groupingMode === 'year') {
        key = date.getFullYear().toString();
      } else if (groupingMode === 'month') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (groupingMode === 'day') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [archivedEntries, groupingMode]);

  // Get sorted keys descending
  const groupKeys = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div
      className={`min-h-screen font-mono relative overflow-hidden transition-colors duration-1000 ${theme === 'light' ? 'bg-[#f0f4f7] text-[#1a202c]' : 'bg-[#05070a] text-cyan-500'}`}
    >
      {/* Bio-Vault Specific Background */}
      <div
        className={`absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:30px_30px] ${theme === 'light' ? 'opacity-10' : ''}`}
      ></div>
      <div
        className={`absolute inset-0 ${theme === 'light' ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),#f0f4f7)]' : 'bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.8),#05070a)]'}`}
      ></div>

      {/* Floating Data Bubbles (Static) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute bottom-[10%] left-[10%] w-2 h-2 rounded-full ${theme === 'light' ? 'bg-cyan-500/20' : 'bg-cyan-500/10 shadow-[0_0_8px_rgba(6,182,212,0.2)]'}`}
        ></div>
        <div
          className={`absolute bottom-[30%] left-[30%] w-4 h-4 rounded-full ${theme === 'light' ? 'bg-cyan-500/10' : 'bg-indigo-500/10'}`}
        ></div>
        <div
          className={`absolute bottom-[70%] left-[70%] w-3 h-3 rounded-full ${theme === 'light' ? 'bg-cyan-500/20' : 'bg-vector-magenta/5 shadow-[0_0_10px_rgba(255,46,204,0.1)]'}`}
        ></div>
      </div>

      {/* Matrix-like falling code effect (Static) */}
      <div
        className={`absolute top-0 left-10 w-[1px] h-full bg-gradient-to-b from-transparent to-transparent ${theme === 'light' ? 'via-cyan-500/10' : 'via-cyan-500/5'}`}
      ></div>
      <div
        className={`absolute top-0 right-20 w-[1px] h-full bg-gradient-to-b from-transparent to-transparent ${theme === 'light' ? 'via-cyan-500/10' : 'via-green-500/20'}`}
      ></div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <header
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 gap-6`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilterHub(!showFilterHub)}
              className={`p-3 border rounded-full transition-all duration-500 cursor-pointer relative z-50 ${
                showFilterHub
                  ? theme === 'light'
                    ? 'bg-[#007a8c] border-[#007a8c] text-white shadow-lg rotate-90 scale-110'
                    : 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] rotate-90 scale-110'
                  : theme === 'light'
                    ? 'bg-white border-[rgba(0,122,140,0.1)] text-[#007a8c] hover:border-[#007a8c] shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-cyan-500/50 hover:bg-white/10'
              }`}
            >
              <Database className="w-8 h-8" />
            </button>
            <div>
              <h1
                className={`text-3xl font-bold tracking-[0.2em] uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}
              >
                {t.appTitle}
              </h1>
              <p
                className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {t.archiveStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`border p-1 rounded-sm ${theme === 'light' ? 'bg-white border-[rgba(0,122,140,0.1)] shadow-sm' : 'bg-green-950/30 border-green-900/50'}`}
            >
              <button
                onClick={() => setView('vault')}
                className={`px-4 py-1 text-[10px] font-bold tracking-widest transition-all ${view === 'vault' ? (theme === 'light' ? 'bg-[#007a8c] text-white shadow-md' : 'bg-green-500 text-black') : theme === 'light' ? 'text-[#718096] hover:text-[#007a8c] hover:bg-[rgba(0,122,140,0.05)]' : 'text-green-700 hover:text-green-400'}`}
              >
                {t.bioVault}
              </button>
              <button
                onClick={() => setView('principles')}
                className={`px-4 py-1 text-[10px] font-bold tracking-widest transition-all ${view === 'principles' ? (theme === 'light' ? 'bg-[#007a8c] text-white shadow-md' : 'bg-green-500 text-black') : theme === 'light' ? 'text-[#718096] hover:text-[#007a8c] hover:bg-[rgba(0,122,140,0.05)]' : 'text-green-700 hover:text-green-400'}`}
              >
                {t.principles}
              </button>
            </div>

            <CyberButton
              variant="ghost"
              onClick={onBack}
              theme={theme}
              className={
                theme === 'light'
                  ? 'text-slate-500 hover:text-cyan-600'
                  : 'text-green-500 hover:text-green-300 hover:border-green-500'
              }
            >
              <ArrowLeft className="w-4 h-4" />{' '}
              <span className="hidden xs:inline">{t.backToConsole}</span>
            </CyberButton>
          </div>
        </header>

        <AnimatePresence>
          {showFilterHub && (
            <div className="mb-12">
              <FilterHub
                entries={archivedEntriesBase}
                language={language}
                theme={theme}
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
                accentColor="green"
                groupingMode={groupingMode}
                onGroupingModeChange={(mode) => setGroupingMode(mode === 'none' ? 'year' : mode)}
              />
            </div>
          )}
        </AnimatePresence>

        {view === 'vault' ? (
          groupKeys.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-20 border border-dashed rounded-lg ${theme === 'light' ? 'bg-white/40 border-[rgba(0,122,140,0.1)] shadow-inner' : 'bg-green-950/5 border-green-900/30'}`}
            >
              <Binary
                className={`w-16 h-16 mb-4 ${theme === 'light' ? 'text-[#718096]/20' : 'text-green-900'}`}
              />
              <p className={`text-lg ${theme === 'light' ? 'text-[#718096]' : 'text-green-700'}`}>
                {t.archiveEmpty}
              </p>
              <p
                className={`text-sm ${theme === 'light' ? 'text-[#718096]/60' : 'text-green-800/60'}`}
              >
                {t.waitingForData}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupKeys.map((key, keyIndex) => (
                <div
                  key={key}
                  className="relative animate-in slide-in-from-bottom-4 fade-in duration-700"
                  style={{ animationDelay: `${keyIndex * 150}ms` }}
                >
                  {/* Header Line */}
                  <div
                    className={`absolute left-[19px] top-10 bottom-0 w-[2px] z-0 ${theme === 'light' ? 'bg-slate-100' : 'bg-green-900/30'}`}
                  ></div>

                  <button
                    onClick={() => toggleGroup(key)}
                    className="relative z-10 flex items-center gap-4 w-full text-left group mb-4"
                  >
                    <div
                      className={`w-10 h-10 flex items-center justify-center border transition-all duration-300 ${expandedGroups[key] ? (theme === 'light' ? 'bg-[rgba(0,122,140,0.05)] border-[#007a8c] text-[#007a8c]' : 'bg-green-900/30 border-green-400 text-green-400') : theme === 'light' ? 'bg-white border-[rgba(0,122,140,0.1)] text-[#718096]/40 group-hover:border-[#007a8c]' : 'bg-black border-green-800 text-green-700 group-hover:border-green-600'}`}
                    >
                      {expandedGroups[key] ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`flex-1 pb-2 transition-colors flex items-end justify-between`}>
                      <div className="flex flex-col">
                        <span
                          className={`text-[10px] font-mono opacity-40 uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-green-500'}`}
                        >
                          {groupingMode === 'year'
                            ? t.year
                            : groupingMode === 'month'
                              ? t.month
                              : t.day}
                        </span>
                        <span
                          className={`text-4xl font-bold transition-colors ${theme === 'light' ? 'text-[#1a202c]/80 group-hover:text-[#007a8c]' : 'text-green-500/80 group-hover:text-green-400'}`}
                        >
                          {key}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono mb-1 ${theme === 'light' ? 'text-[#718096]' : 'text-green-800'}`}
                      >
                        {groupedEntries[key].length} {t.dataSamples}
                      </span>
                    </div>
                  </button>

                  {/* Entries Grid */}
                  <AnimatePresence>
                    {expandedGroups[key] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                        className="overflow-hidden pl-14"
                      >
                        <div
                          className={
                            groupedEntries[key].length > 10
                              ? 'space-y-4 pb-4'
                              : 'min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 pb-4'
                          }
                        >
                          {groupedEntries[key].map((entry, idx) => {
                            const isListView = groupedEntries[key].length > 10;
                            const displayIdx = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                            const yearSuffix = new Date(entry.createdAt)
                              .getFullYear()
                              .toString()
                              .slice(2);
                            const archiveId = `AR-${yearSuffix}-${entry.id.slice(0, 4).toUpperCase()}`;

                            if (isListView) {
                              return (
                                <motion.div
                                  key={entry.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                  onClick={() => {
                                    if (entry.unlockAt && entry.unlockAt > now) return;
                                    onSelectEntry(entry);
                                  }}
                                  className="flex items-center group/container"
                                >
                                  {/* Structural Spine Segment */}
                                  <div className="relative w-12 flex items-center justify-center pointer-events-none">
                                    <div
                                      className={`absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed transform -translate-x-1/2 ${theme === 'light' ? 'border-slate-200' : 'border-green-900/40'}`}
                                    />
                                    <div
                                      className={`z-10 text-[7px] font-black font-mono px-1.5 py-0.5 rounded border shadow-sm transition-all duration-300 group-hover/container:scale-110 ${theme === 'light' ? 'bg-white border-slate-300 text-slate-400' : 'bg-black border-green-800/60 text-green-800'}`}
                                    >
                                      {displayIdx}
                                    </div>
                                  </div>

                                  <div
                                    className={`
                                        flex-1 flex items-center gap-4 p-3 border transition-all cursor-pointer group/item relative overflow-hidden font-mono text-[11px] rounded-sm
                                        ${
                                          entry.unlockAt && entry.unlockAt > now
                                            ? theme === 'light'
                                              ? 'border-indigo-200 bg-indigo-50/50 cursor-not-allowed opacity-80 shadow-sm'
                                              : 'border-indigo-900/40 bg-indigo-950/20 cursor-not-allowed opacity-80 group-hover/item:shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                                            : theme === 'light'
                                              ? 'bg-gradient-to-r from-white/90 to-white/60 border-[rgba(0,122,140,0.1)] hover:bg-white hover:border-[#007a8c] text-[#4a5568] shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
                                              : 'bg-gradient-to-br from-green-950/20 via-green-950/10 to-transparent border-cyan-900/40 hover:bg-green-950/30 hover:border-cyan-400/60 text-green-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.02)]'
                                        }
                                      `}
                                  >
                                    {/* Outer Frame Accent for List Item */}
                                    <div
                                      className={`absolute top-0 left-0 w-full h-[1px] opacity-10 ${theme === 'light' ? 'bg-[#007a8c]' : 'bg-cyan-500'}`}
                                    />
                                    <div
                                      className={`absolute bottom-0 left-0 w-full h-[1px] opacity-10 ${theme === 'light' ? 'bg-[#007a8c]' : 'bg-cyan-500'}`}
                                    />

                                    {/* Gradient Border Accent for List Item */}
                                    <div
                                      className={`absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none ${theme === 'light' ? 'bg-gradient-to-r from-cyan-500/5 to-transparent' : 'bg-gradient-to-r from-cyan-500/10 to-transparent'}`}
                                    />

                                    {/* Scanning Laser Line (List View) */}
                                    <motion.div
                                      className={`absolute top-0 bottom-0 w-1 pointer-events-none z-10 opacity-0 group-hover/item:opacity-100 ${theme === 'light' ? 'bg-gradient-to-b from-transparent via-cyan-400 to-transparent' : 'bg-gradient-to-b from-transparent via-cyan-400 to-transparent'}`}
                                      initial={{ left: '-5%' }}
                                      whileHover={{
                                        left: ['-5%', '105%'],
                                        transition: {
                                          duration: 1.5,
                                          repeat: Infinity,
                                          ease: 'linear',
                                        },
                                      }}
                                    />

                                    {/* Stereoscopic Decorative Brackets */}
                                    <div
                                      className={`absolute top-0 right-0 w-2 h-2 border-t border-r opacity-0 group-hover/item:opacity-60 transition-all duration-300 ${theme === 'light' ? 'border-cyan-600' : 'border-cyan-400'}`}
                                    />
                                    <div
                                      className={`absolute bottom-1 left-0 w-0.5 h-4 opacity-30 ${theme === 'light' ? 'bg-cyan-200' : 'bg-cyan-900'}`}
                                    />

                                    <div className="shrink-0 flex flex-col gap-0.5">
                                      <div className="opacity-80 text-cyan-800 font-bold">
                                        [{new Date(entry.createdAt).toLocaleDateString()}]
                                      </div>
                                      <div
                                        className={`text-[8px] opacity-30 tracking-tighter ${theme === 'light' ? 'text-slate-400' : 'text-green-900'}`}
                                      >
                                        {archiveId}
                                      </div>
                                    </div>

                                    <div className="flex-1 truncate tracking-[0.1em] flex items-center gap-2">
                                      <span className="opacity-40 text-cyan-800 font-black">
                                        {'>>'}
                                      </span>
                                      <span
                                        className={`transition-colors uppercase font-bold truncate ${theme === 'light' ? 'group-hover:text-[#007a8c]' : 'text-green-500 group-hover:text-cyan-200'}`}
                                      >
                                        {entry.title}
                                      </span>
                                    </div>

                                    <div className="shrink-0 opacity-60 hidden md:block text-cyan-900 text-[10px]">
                                      {entry.tags.slice(0, 2).map((t) => (
                                        <span
                                          key={t}
                                          className={`mr-2 px-1 border border-transparent hover:border-current transition-colors`}
                                        >
                                          #{t}
                                        </span>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {entry.unlockAt && entry.unlockAt > now ? (
                                        <div className="flex items-center gap-1.5 text-[#C85F72] transition-colors neon-glow-alert">
                                          <Lock className="w-3 h-3" />
                                          <span className="text-[9px] font-bold tracking-tighter uppercase px-1 border border-[#C85F72]/30 neon-border-alert">
                                            {t.encryptedRecord || 'RESTRICTED'}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-cyan-700 group-hover/item:text-teal-400 transition-colors">
                                          <Shield className="w-3 h-3" />
                                          <span className="text-[8px] font-bold opacity-60 uppercase">
                                            {t.safeRecord || 'VERIFIED'}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {entry.attachment ? (
                                      <Paperclip className="w-3 h-3 text-cyan-500 opacity-80" />
                                    ) : (
                                      <div
                                        className={`w-3 h-px opacity-20 ${theme === 'light' ? 'bg-slate-400' : 'bg-green-600'}`}
                                      />
                                    )}
                                  </div>
                                </motion.div>
                              );
                            }

                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => {
                                  if (entry.unlockAt && entry.unlockAt > now) return;
                                  onSelectEntry(entry);
                                }}
                                className={`
                                       border p-4 transition-all cursor-pointer group/item relative overflow-hidden rounded-sm
                                       ${
                                         entry.unlockAt && entry.unlockAt > now
                                           ? theme === 'light'
                                             ? 'bg-indigo-50/60 border-indigo-200/40 cursor-not-allowed grayscale opacity-70 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]'
                                             : 'bg-indigo-950/20 border-indigo-900/40 cursor-not-allowed grayscale opacity-70 shadow-[inset_0_0_40px_rgba(244,63,94,0.1)]'
                                           : theme === 'light'
                                             ? 'bg-gradient-to-br from-white to-slate-50 border-[rgba(0,122,140,0.1)] hover:border-[#007a8c] hover:shadow-lg'
                                             : 'bg-gradient-to-br from-green-950/10 to-transparent border-cyan-900/40 hover:bg-green-900/20 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.05)]'
                                       }
                                    `}
                              >
                                {/* Nested Mechanical Frame (Grid) */}
                                <div
                                  className={`absolute inset-[2px] border pointer-events-none transition-all duration-500 opacity-20 ${theme === 'light' ? 'border-slate-200 group-hover/item:border-cyan-200' : 'border-green-900/30 group-hover/item:border-cyan-900/50'}`}
                                />

                                {/* Inner Depth Glow (Grid) */}
                                <div
                                  className={`absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-700 pointer-events-none ${theme === 'light' ? 'shadow-[inset_0_0_30px_rgba(0,122,140,0.05)]' : 'shadow-[inset_0_0_40px_rgba(34,211,238,0.03)]'}`}
                                />

                                {/* Scanning Laser Line (Grid View) */}
                                <motion.div
                                  className={`absolute left-0 right-0 h-0.5 pointer-events-none z-10 opacity-0 group-hover/item:opacity-100 ${theme === 'light' ? 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent'}`}
                                  initial={{ top: '-5%' }}
                                  whileHover={{
                                    top: ['-5%', '105%'],
                                    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
                                  }}
                                />

                                {/* Stereoscopic Decorative Brackets for Grid Item */}
                                <div
                                  className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 transition-all duration-300 ${theme === 'light' ? 'border-slate-100 group-hover/item:border-cyan-600' : 'border-green-950 group-hover/item:border-cyan-500'}`}
                                />
                                <div
                                  className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r transition-all duration-300 ${theme === 'light' ? 'border-slate-100 group-hover/item:border-cyan-200' : 'border-cyan-900 group-hover/item:border-cyan-900'}`}
                                />

                                <div
                                  className={`absolute top-0 right-10 text-[8px] font-mono opacity-20 group-hover/item:opacity-40 transition-opacity p-1 border-x border-b tracking-tighter ${theme === 'light' ? 'text-slate-500 border-slate-200' : 'text-green-700 border-green-900'}`}
                                >
                                  {archiveId}
                                </div>

                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`p-1.5 rounded transition-colors ${entry.unlockAt && entry.unlockAt > now ? 'bg-[#C85F72]/10 text-[#C85F72] shadow-[0_0_8px_rgba(200,95,114,0.2)]' : 'bg-cyan-500/5 text-cyan-600'}`}
                                    >
                                      {entry.unlockAt && entry.unlockAt > now ? (
                                        <Lock className="w-3.5 h-3.5" />
                                      ) : (
                                        <Shield className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    {entry.attachment && (
                                      <Paperclip className="w-3 h-3 text-cyan-500" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] border px-1.5 py-0.5 rounded-sm font-mono tracking-tighter ${theme === 'light' ? 'text-[#718096] border-[rgba(0,122,140,0.1)]' : 'text-green-800 border-green-900/40'}`}
                                  >
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4
                                  className={`font-bold mb-2 truncate tracking-tight text-sm ${theme === 'light' ? 'text-[#1a202c] group-hover/item:text-[#007a8c]' : 'text-cyan-100 group-hover/item:text-cyan-50'}`}
                                >
                                  {entry.title}
                                </h4>
                                <div className="flex items-center justify-between border-t border-dashed mt-2 pt-2 border-[rgba(0,122,140,0.05)]">
                                  <p
                                    className={`text-[9px] truncate font-mono tracking-tighter ${theme === 'light' ? 'text-[#718096]' : 'text-green-900'}`}
                                  >
                                    {entry.tags.map((t) => `#${t}`).join(' ')}
                                  </p>
                                  <span
                                    className={`text-[8px] font-black uppercase tracking-tighter sm:opacity-0 group-hover/item:opacity-100 transition-opacity ${entry.unlockAt && entry.unlockAt > now ? 'text-[#C85F72] neon-glow-alert' : 'text-teal-500'}`}
                                  >
                                    {entry.unlockAt && entry.unlockAt > now
                                      ? 'RES_LOCK'
                                      : 'CLR_AUTH'}
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4 mb-8">
              <div
                className={`p-3 border rounded-lg ${theme === 'light' ? 'bg-white border-[rgba(0,122,140,0.1)] shadow-sm' : 'bg-white/5 border-white/10'}`}
              >
                <Book
                  className={`w-6 h-6 ${theme === 'light' ? 'text-[#007a8c]' : 'text-cyan-400'}`}
                />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold tracking-widest uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}
                >
                  {t.principlesLibrary}
                </h2>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t.principlesDesc}
                </p>
              </div>
            </div>

            {/* Add Principle Form */}
            <div
              className={`border p-6 rounded-sm mb-12 relative overflow-hidden group ${theme === 'light' ? 'bg-white/60 border-[rgba(0,122,140,0.05)] shadow-sm' : 'bg-green-950/10 border-green-900/50'}`}
            >
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <textarea
                      value={newPrincipleText}
                      onChange={(e) => setNewPrincipleText(e.target.value.slice(0, 30))}
                      placeholder={t.principlePlaceholder.replace(
                        '{year}',
                        selectedYear.toString(),
                      )}
                      className={`w-full border p-3 text-sm focus:border-[#007a8c] outline-none min-h-[80px] resize-none font-mono ${theme === 'light' ? 'bg-[rgba(0,122,140,0.02)] border-[rgba(0,122,140,0.05)] text-[#1a202c] placeholder:text-[#718096]/30' : 'bg-black border-white/5 text-cyan-400 placeholder:text-cyan-900'} ${newPrincipleText.length >= 30 ? 'border-[#C85F72]/50' : ''}`}
                    />
                    <div className="flex justify-between mt-1 px-1">
                      <span
                        className={`text-[9px] font-mono ${newPrincipleText.length >= 30 ? 'text-[#C85F72] neon-glow-alert' : theme === 'light' ? 'text-[#718096]/40' : 'text-slate-600'}`}
                      >
                        {t.charLimit.replace('{count}', newPrincipleText.length.toString())}
                      </span>
                      {newPrincipleText.length >= 30 && (
                        <span className="text-[9px] font-mono text-[#C85F72] uppercase tracking-tighter neon-glow-alert">
                          {t.charLimitWarning}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-32 flex flex-col gap-2">
                    <div
                      className={`text-[10px] uppercase tracking-widest mb-1 ${theme === 'light' ? 'text-[#718096]' : 'text-green-800'}`}
                    >
                      {t.targetYear}
                    </div>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) =>
                        setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())
                      }
                      className={`border p-2 text-xs outline-none focus:border-[#007a8c] w-full ${theme === 'light' ? 'bg-[rgba(0,122,140,0.02)] border-[rgba(0,122,140,0.05)] text-[#4a5568]' : 'bg-black border-green-900/50 text-green-500'}`}
                      min="1900"
                      max="2100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 px-1">
                  <button
                    onClick={() => setShowOnHome(!showOnHome)}
                    className={`w-4 h-4 border flex items-center justify-center transition-all ${showOnHome ? (theme === 'light' ? 'bg-[#007a8c] border-[#007a8c]' : 'bg-green-500 border-green-500') : theme === 'light' ? 'border-[rgba(0,122,140,0.1)]' : 'border-green-900'}`}
                  >
                    {showOnHome && (
                      <div
                        className={`w-2 h-2 ${theme === 'light' ? 'bg-white' : 'bg-black'}`}
                      ></div>
                    )}
                  </button>
                  <span
                    className={`text-[10px] uppercase tracking-widest ${theme === 'light' ? 'text-[#718096]' : 'text-green-700'}`}
                  >
                    {t.showOnHome}
                  </span>
                </div>

                <CyberButton
                  onClick={() => {
                    if (newPrincipleText.trim()) {
                      onAddPrinciple(newPrincipleText, selectedYear, showOnHome);
                      setNewPrincipleText('');
                    }
                  }}
                  disabled={!newPrincipleText.trim()}
                  className="w-full"
                  theme={theme}
                >
                  <Plus className="w-4 h-4" /> {t.addPrinciple}
                </CyberButton>
              </div>
            </div>

            {/* Principles List */}
            {principles.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center py-12 border border-dashed rounded-lg ${theme === 'light' ? 'border-[rgba(0,122,140,0.1)] bg-white/40' : 'border-green-900/30'}`}
              >
                <Shield
                  className={`w-12 h-12 mb-4 opacity-30 ${theme === 'light' ? 'text-[#718096]/20' : 'text-green-900'}`}
                />
                <p className={`text-sm ${theme === 'light' ? 'text-[#718096]' : 'text-green-800'}`}>
                  {t.noPrinciples}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group principles by year */}
                {Array.from(new Set(principles.map((p) => p.year)))
                  .sort((a: number, b: number) => b - a)
                  .map((year) => (
                    <div key={year} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-[10px] font-bold tracking-[0.3em] uppercase ${theme === 'light' ? 'text-[#718096]/40' : 'text-green-600'}`}
                        >
                          {t.formedThrough.replace('{year}', year.toString())}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {principles
                          .filter((p) => p.year === year)
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((principle, idx) => (
                            <motion.div
                              key={principle.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`group relative border p-5 transition-all overflow-hidden ${theme === 'light' ? 'bg-white/60 border-[rgba(0,122,140,0.05)] hover:border-[#007a8c]/30 hover:bg-white' : 'bg-green-950/5 border-green-900/30 hover:border-green-500/50 hover:bg-green-950/10'}`}
                            >
                              {/* Nested Mechanical Frame (Principle) */}
                              <div
                                className={`absolute inset-[2px] border pointer-events-none transition-all duration-500 opacity-20 ${theme === 'light' ? 'border-slate-200 group-hover:border-cyan-200' : 'border-green-900/30 group-hover:border-green-500/30'}`}
                              />

                              {/* Scanning Laser Line (Principles) */}
                              <motion.div
                                className={`absolute top-0 bottom-0 w-1 pointer-events-none z-10 opacity-0 group-hover:opacity-100 ${theme === 'light' ? 'bg-gradient-to-b from-transparent via-cyan-400 to-transparent' : 'bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.4)]'}`}
                                initial={{ left: '-5%' }}
                                whileHover={{
                                  left: ['-5%', '105%'],
                                  transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
                                }}
                              />
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-4">
                                  <div
                                    className={`mt-1 w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-[#007a8c]' : 'bg-green-500'}`}
                                  ></div>
                                  <p
                                    className={`text-sm leading-relaxed tracking-wide ${theme === 'light' ? 'text-[#4a5568]' : 'text-green-300'}`}
                                  >
                                    {principle.text}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      onUpdatePrinciple({
                                        ...principle,
                                        showOnHome: !principle.showOnHome,
                                      })
                                    }
                                    className={`p-1 rounded border transition-all ${principle.showOnHome ? (theme === 'light' ? 'bg-[rgba(0,122,140,0.05)] border-[#007a8c] text-[#007a8c]' : 'bg-green-500/10 border-green-500/50 text-green-400') : theme === 'light' ? 'bg-white border-[rgba(0,122,140,0.1)] text-[#718096]/40 hover:border-[#007a8c]' : 'bg-black border-green-900 text-green-900 hover:border-green-700'}`}
                                    title={t.showOnHome}
                                  >
                                    <Star
                                      className={`w-3 h-3 ${principle.showOnHome ? (theme === 'light' ? 'fill-[#007a8c]/20' : 'fill-green-400/20') : ''}`}
                                    />
                                  </button>
                                  <button
                                    onClick={() => onDeletePrinciple(principle.id)}
                                    className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${theme === 'light' ? 'text-[#718096]/30 hover:text-[#C85F72]' : 'text-slate-600 hover:text-[#C85F72] hover:drop-shadow-[0_0_5px_rgba(200,95,114,0.5)]'}`}
                                    title={t.deletePrinciple}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
