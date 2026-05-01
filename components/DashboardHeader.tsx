import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Minimize, Globe, Settings, Archive, Plus } from 'lucide-react';
import { GeometricBoat } from './GeometricBoat';
import { Language, Theme } from '../types';
import { CyberButton } from './CyberButton';
import { TRANSLATIONS, NATIVE_LANG_NAMES } from '../constants';
import { useTimeoutManager } from '../hooks/useTimeoutManager';

interface DashboardHeaderProps {
  theme: Theme;
  language: Language;
  dynamicVersion: string;
  isFullscreen: boolean;
  onOpenArchive: () => void;
  onNewEntry: () => void;
  toggleFullScreen: () => void;
  setShowSettings: (show: boolean) => void;
  showConfirmHome: boolean;
  setShowConfirmHome: (show: boolean) => void;
  lastClickTime: number;
  setLastClickTime: (time: number) => void;
  onReplayIntro: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  theme,
  language,
  dynamicVersion,
  isFullscreen,
  onOpenArchive,
  onNewEntry,
  toggleFullScreen,
  setShowSettings,
  showConfirmHome,
  setShowConfirmHome,
  lastClickTime,
  setLastClickTime,
  onReplayIntro
}) => {
  const t = TRANSLATIONS[language];
  const { scheduleTimeout } = useTimeoutManager();

  return (
    <header className={`flex flex-col md:flex-row justify-between items-end mb-16 pb-6 relative gap-8 border-b border-white/[0.03]`}>
      <div className="w-full md:w-auto">
        <div className="flex items-baseline gap-3 mb-2">
           <h2 className={`text-3xl sm:text-5xl font-black tracking-tighter uppercase ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`} style={{ letterSpacing: '-0.05em' }}>{t.appTitle}</h2>
          <span className={`text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-1 border ${theme === 'light' ? 'text-slate-400 border-slate-200 bg-white shadow-sm' : 'text-cyan-500/80 border-cyan-500/20 bg-cyan-500/5'}`}>{dynamicVersion}</span>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-[10px] font-mono tracking-[0.3em] uppercase opacity-60 ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
            {t.archiveStatus}
          </p>
          <div className={`h-[1px] w-24 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
          <div className="flex items-center gap-1.5 animate-pulse">
            <div className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-emerald-500' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`} />
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-80">Sync Active</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
        
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {showConfirmHome && (
              <motion.span 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-[10px] font-mono text-[#C85F72] font-bold uppercase tracking-widest neon-glow-alert"
              >
                {t.confirmAction || "Confirm?"}
              </motion.span>
            )}
          </AnimatePresence>
          <button 
             onClick={() => {
               const now = Date.now();
               if (showConfirmHome) {
                 if (now - lastClickTime > 500) {
                   onReplayIntro();
                 }
               } else {
                 setShowConfirmHome(true);
                 setLastClickTime(now);
                 scheduleTimeout(() => setShowConfirmHome(false), 3000);
               }
             }}
             className={`p-2 border transition-all rounded-sm group relative w-12 h-12 flex items-center justify-center ${showConfirmHome ? 'border-[#C85F72] text-[#C85F72] bg-[#C85F72]/5 shadow-[0_0_15px_rgba(200,95,114,0.1)]' : (theme === 'light' ? 'border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 bg-white' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5')}`}
             title={t.backToHome || "Back to Home"}
          >
             <GeometricBoat className="w-7 h-7" theme={theme} />
          </button>
        </div>

        <button 
           onClick={toggleFullScreen}
           className={`p-2 border transition-all rounded-sm group relative w-12 h-12 flex items-center justify-center ${theme === 'light' ? 'border-slate-200 text-slate-400 hover:text-slate-900 bg-white' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5'}`}
           title={t.toggleFullscreen}
        >
           {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        <button 
           onClick={() => setShowSettings(true)}
           className={`p-2 border transition-all rounded-sm group relative w-12 h-12 flex items-center justify-center ${theme === 'light' ? 'border-slate-200 text-slate-400 hover:text-slate-900 bg-white' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5'}`}
           title={t.settingsTitle}
        >
           <Settings className="w-5 h-5 group-hover:rotate-180 transition-transform duration-1000" />
           <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-emerald-500' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`}></div>
        </button>
        

        <CyberButton onClick={onOpenArchive} variant="ghost" className="text-[10px] tracking-[0.2em] h-12 px-6" theme={theme}>
          <Archive className="w-4 h-4 mr-2" /> {t.archive}
        </CyberButton>
        <CyberButton onClick={onNewEntry} theme={theme} className="h-12 px-8 uppercase font-black tracking-widest text-base shadow-[0_8px_32px_rgba(0,210,255,0.15)]">
          <Plus className="w-5 h-5 mr-1" /> {t.newEntry}
        </CyberButton>
      </div>
    </header>
  );
};
