import React, { useState } from 'react';
import { Activity, ShieldAlert, Sun, Moon, ArrowDown, Fingerprint, Anchor, ChevronRight, Palette, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../constants';

interface StatisticsWidgetProps {
  theme: Theme;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  customIdentity: string;
  setCustomIdentity: (identity: string) => void;
  dynamicVersion: string;
  isUnlocked: boolean;
  onSetTheme: (theme: Theme) => void;
  setSecurityMode: (mode: 'idle'|'setup'|'confirm') => void;
  setIsViewingRecovery: (viewing: boolean) => void;
  passwordHash: string | null;
}

// Geometric Boat SVG Component for inner use if needed, else imported
const Sailboat = ({ className, theme }: { className?: string, theme: Theme }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <polygon points="20,70 80,70 65,85 35,85" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <line x1="50" y1="18" x2="50" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={theme === 'light' ? 'text-cyan-600' : 'text-indigo-500'} />
    <polygon points="52,22 52,65 76,65" fill="#0891b2" fillOpacity="0.4" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points="48,32 48,65 30,65" fill="#0891b2" fillOpacity="0.1" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const StatisticsWidget: React.FC<StatisticsWidgetProps> = ({
  theme,
  language,
  onSetLanguage,
  customIdentity,
  setCustomIdentity,
  dynamicVersion,
  isUnlocked,
  onSetTheme,
  setSecurityMode,
  setIsViewingRecovery,
  passwordHash
}) => {
  const t = TRANSLATIONS[language];

  const [themeExpanded, setThemeExpanded] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);

  return (
    <div className={`relative rounded-2xl border p-6 space-y-6 transition-all overflow-hidden ${theme === 'light' ? 'bg-white/80 border-slate-100 shadow-sm' : 'bg-black/40 border-cyan-900/20'}`}>
      {/* Decorative Corner Accents */}
      <div className={`absolute top-0 left-0 w-8 h-8 pointer-events-none border-t border-l ${theme === 'light' ? 'border-cyan-200' : 'border-cyan-500/20'}`} />
      <div className={`absolute top-0 right-0 w-8 h-8 pointer-events-none border-t border-r ${theme === 'light' ? 'border-cyan-200' : 'border-cyan-500/20'}`} />
      <div className={`absolute bottom-0 left-0 w-8 h-8 pointer-events-none border-b border-l ${theme === 'light' ? 'border-cyan-200' : 'border-cyan-500/20'}`} />
      <div className={`absolute bottom-0 right-0 w-8 h-8 pointer-events-none border-b border-r ${theme === 'light' ? 'border-cyan-200' : 'border-cyan-500/20'}`} />
      
      {/* Structural Scanline or Grid Accent */}
      <div className={`absolute top-0 left-12 right-12 h-px pointer-events-none ${theme === 'light' ? 'bg-gradient-to-r from-transparent via-cyan-100 to-transparent opacity-50' : 'bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent opacity-30'}`} />

      <div className="flex items-center gap-2 mb-2 relative z-10">
         <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-950/50 text-cyan-400'}`}>
           <Activity className="w-5 h-5" />
         </span>
         <h4 className={`text-sm font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-800' : 'text-cyan-200'}`}>{t.navStatus}</h4>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
         <div className="flex flex-1 gap-5 items-start">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border shrink-0 shadow-inner ${theme === 'light' ? 'bg-[#f0f9fa] border-cyan-100' : 'bg-cyan-950/20 border-cyan-900/30'}`}>
              <Sailboat className={`w-10 h-10 ${theme === 'light' ? 'text-cyan-500' : 'text-cyan-400'}`} theme={theme} />
            </div>
            <div className="flex-1 min-w-0 py-1">
               <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <input 
                     type="text" 
                     value={customIdentity} 
                     onChange={e => setCustomIdentity(e.target.value)}
                     className={`text-lg font-bold bg-transparent border-none p-0 focus:ring-0 w-full lg:w-auto outline-none ${theme === 'light' ? 'text-slate-800' : 'text-cyan-100'}`}
                     placeholder={t.defineYourself}
                  />
                  <span className={`text-xs font-mono opacity-60 ${theme === 'light' ? 'text-slate-500' : 'text-[#6e8198]'}`}>· {t.version} {dynamicVersion}</span>
               </div>
               <div className={`flex items-center gap-2 text-xs font-medium ${theme === 'light' ? 'text-green-600' : 'text-[#11bfaf]'}`}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {t.encryptionActive}
               </div>

               <div 
                  onClick={() => setSecurityMode('setup')}
                  className={`mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap bg-opacity-30 rounded-full px-3 py-1 cursor-pointer hover:ring-1 hover:ring-[#12d8ff]/30 transition-all ${theme === 'light' ? 'bg-cyan-50 text-cyan-600' : 'bg-[#12d8ff]/5 text-[#6e8198]'}`}
               >
                  <Fingerprint className="w-3 h-3" />
                  {t.securityCalibration}: {isUnlocked ? <span className="text-green-500">{t.statusUnlocked}</span> : <span className="text-[#11bfaf] opacity-80">{t.statusOnline}</span>} · {t.secLevelHigh}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            {/* Theme Section */}
            <div className="flex flex-col gap-3">
               <div 
                  onClick={() => setThemeExpanded(!themeExpanded)}
                  className={`flex items-center justify-between group cursor-pointer text-[10px] font-mono uppercase tracking-[0.2em] px-1 py-1 rounded-lg transition-all ${theme === 'light' ? 'hover:bg-cyan-50 text-slate-400 hover:text-cyan-600' : 'hover:bg-cyan-950/30 text-cyan-800 hover:text-cyan-400'}`}
               >
                  <div className="flex items-center gap-2">
                    <Palette className="w-3 h-3" />
                    {t.lightShadowMode}
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${themeExpanded ? 'rotate-180' : ''}`} />
               </div>
               
               <AnimatePresence>
                {themeExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-cyan-500/10">
                      <button 
                        onClick={() => onSetTheme('light')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-left group ${theme === 'light' ? 'bg-white border-cyan-200 shadow-sm' : 'bg-transparent border-[#173242]/20'}`}
                      >
                         <div className="flex items-center gap-2 w-full mb-1">
                            <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-cyan-500' : 'text-[#6e8198]/30'}`} />
                            <span className={`text-[10px] font-bold ${theme === 'light' ? 'text-slate-800' : 'text-[#6e8198]/30'}`}>{t.lightMode}</span>
                            <ArrowDown className={`w-3 h-3 ml-auto rotate-[-135deg] ${theme === 'light' ? 'text-cyan-400' : 'text-[#173242]/40'}`} />
                         </div>
                      </button>

                      <button 
                        onClick={() => onSetTheme('dark')}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-left ${theme === 'dark' ? 'bg-[#12d8ff]/5 border-[#12d8ff]/40' : 'bg-transparent border-slate-100'}`}
                      >
                         <div className="flex items-center gap-2 w-full mb-1">
                            <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-[#12d8ff]' : 'text-slate-300'}`} />
                            <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-[#eaf4ff]' : 'text-slate-300'}`}>{t.darkMode}</span>
                            <ArrowDown className={`w-3 h-3 ml-auto rotate-[-135deg] ${theme === 'dark' ? 'text-[#12d8ff]/50' : 'text-slate-100'}`} />
                         </div>
                      </button>
                    </div>
                  </motion.div>
                )}
               </AnimatePresence>
            </div>

            {/* Language Section */}
            <div className="flex flex-col gap-3">
               <div 
                  onClick={() => setLanguageExpanded(!languageExpanded)}
                  className={`flex items-center justify-between group cursor-pointer text-[10px] font-mono uppercase tracking-[0.2em] px-1 py-1 rounded-lg transition-all ${theme === 'light' ? 'hover:bg-cyan-50 text-slate-400 hover:text-cyan-600' : 'hover:bg-cyan-950/30 text-cyan-800 hover:text-cyan-400'}`}
               >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    {t.interfaceLanguage}
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${languageExpanded ? 'rotate-180' : ''}`} />
               </div>

               <AnimatePresence>
                {languageExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-1 border-t border-dashed border-cyan-500/10">
                      {[
                        { id: 'zh', label: '中文' },
                        { id: 'en', label: 'English' },
                        { id: 'ja', label: '日本語' },
                        { id: 'ko', label: '한국어' },
                        { id: 'fr', label: 'Français' },
                        { id: 'de', label: 'Deutsch' },
                        { id: 'es', label: 'Español' }
                      ].map(lang => (
                        <button 
                          key={lang.id}
                          onClick={() => onSetLanguage(lang.id as Language)}
                          className={`flex items-center justify-center py-1.5 px-1 rounded-lg border transition-all text-[9px] font-mono cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${language === lang.id 
                            ? (theme === 'light' ? 'bg-cyan-50 border-cyan-400 text-cyan-600 shadow-sm' : 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-bold') 
                            : (theme === 'light' ? 'bg-white border-slate-100 text-slate-400 hover:border-cyan-200 hover:text-cyan-500' : 'bg-white/[0.02] border-white/[0.05] text-[#6e8198] hover:border-cyan-800 hover:text-cyan-400')}`}
                        >
                          {lang.label}
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
        onClick={() => setIsViewingRecovery(true)}
        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${theme === 'light' ? 'bg-cyan-50/50 border-cyan-100/50 hover:bg-cyan-100/50' : 'bg-[#12d8ff]/5 border-[#173242]/30 hover:border-[#12d8ff]/30'}`}
      >
         <div className="flex items-center gap-3">
            <Anchor className={`w-5 h-5 ${theme === 'light' ? 'text-cyan-500' : 'text-[#12d8ff]'}`} />
            <span className={`text-sm font-bold ${theme === 'light' ? 'text-cyan-700' : 'text-[#eaf4ff]'}`}>{t.emergencyAnchor}</span>
            <span className={`hidden md:inline text-xs ${theme === 'light' ? 'text-slate-400' : 'text-[#6e8198]/40'}`}> —— {passwordHash ? (language === 'zh' ? '32位唯一凭证已备案' : '32-char logic anchor secured') : t.emergencyAnchorDesc}</span>
         </div>
         <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono ${theme === 'light' ? 'text-cyan-600' : 'text-[#12d8ff]/80'}`}>{passwordHash ? (language === 'zh' ? '点击检视' : 'Click to View') : (language === 'zh' ? '尚未备份' : 'No Backup')}</span>
            <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-cyan-300' : 'text-[#6e8198]/30'}`} />
         </div>
      </div>
    </div>
  );
};
