import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Terminal,
  Zap,
  Cpu,
  Scan,
  Globe,
  Star,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { PRESET_PRINCIPLES, TRANSLATIONS } from '../constants';
import { CyberButton } from './CyberButton';
import { DecryptionText } from './DecryptionText';
import { Language, Principle, Theme } from '../types';
import { MemoryFragments } from './MemoryFragments';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { createSeededRandom } from '../lib/random';

interface CoverScreenProps {
  onStart: () => void;
  language: Language;
  principles: Principle[];
  theme?: Theme;
}

type CoverVersion = 'STAR_TUNNEL' | 'WARP_SPEED' | 'GATE' | 'TERMINAL';
type PrincipleSource = Partial<Principle> & {
  source?: string;
  text: string;
  year?: number;
  date?: string;
};

export const CoverScreen: React.FC<CoverScreenProps> = ({
  onStart,
  language,
  principles,
  theme = 'dark',
}) => {
  const [version, setVersion] = useState<CoverVersion>('STAR_TUNNEL');
  const [isWarping, setIsWarping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { scheduleTimeout } = useTimeoutManager();
  const t = TRANSLATIONS[language];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInitialize = () => {
    setIsWarping(true);
    scheduleTimeout(() => {
      onStart();
    }, 1200);
  };

  // 1. MASSIVE DENSITY: Duplicate principles to create a solid texture of text
  // Ensure we have at least a few different principles to show
  const sourcePrinciples = useMemo<PrincipleSource[]>(
    () =>
      principles.length >= 5
        ? principles
        : [...principles, ...(PRESET_PRINCIPLES[language] || PRESET_PRINCIPLES['en'])],
    [language, principles],
  );

  const wallData = useMemo(
    () => Array.from({ length: 30 }).flatMap(() => sourcePrinciples),
    [sourcePrinciples],
  );

  const wallItems = useMemo(
    () =>
      wallData.map((principle, index) => {
        const keyBase = 'id' in principle ? principle.id : principle.text;
        const key = `${keyBase}-${index}`;
        const random = createSeededRandom(key);
        return {
          principle,
          isHighlight: random() > 0.85,
          isPink: random() > 0.8,
          opacity: random() * 0.5 + 0.3,
          key,
        };
      }),
    [wallData],
  );

  const renderVersion = () => {
    switch (version) {
      case 'STAR_TUNNEL':
        return <MemoryFragments onComplete={onStart} language={language} principles={principles} />;

      case 'WARP_SPEED':
        return (
          <div
            className={`relative min-h-screen overflow-hidden flex flex-col items-center justify-center perspective-[1000px] transition-colors duration-1000 ${theme === 'light' ? 'bg-vector-fog-light' : 'bg-black'}`}
          >
            {/* Nebula Atmosphere Layers */}
            <div
              className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ${isWarping ? 'opacity-0' : 'opacity-100'}`}
            >
              <div
                className={`absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] rounded-full blur-[120px] mix-blend-screen animate-[nebula-drift_25s_infinite_alternate] ${theme === 'light' ? 'bg-cyan-200/20' : 'bg-cyan-900/20'}`}
              ></div>
              <div
                className={`absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] rounded-full blur-[120px] mix-blend-screen animate-[nebula-drift_30s_infinite_alternate_reverse] ${theme === 'light' ? 'bg-blue-200/20' : 'bg-vector-magenta-bright/5'}`}
              ></div>
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full blur-[100px] mix-blend-screen animate-pulse ${theme === 'light' ? 'bg-cyan-100/10' : 'bg-indigo-900/10'}`}
              ></div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            {/* The Data Wall */}
            <div
              className={`absolute inset-[-50%] w-[200%] h-[200%] flex flex-wrap content-center justify-center gap-x-12 gap-y-6 p-4 
              transform-gpu will-change-transform select-none pointer-events-none z-0
              ${isWarping ? 'animate-[warp-speed_1s_ease-in_forwards]' : 'animate-[scroll-wall_120s_linear_infinite]'}
            `}
            >
              {wallItems.map(({ principle: p, isHighlight, isPink, opacity, key }) => {
                return (
                  <div
                    key={key}
                    className="font-mono whitespace-nowrap px-4 transition-all duration-1000"
                    style={{
                      opacity,
                      fontSize: isHighlight ? '24px' : '16px',
                      fontWeight: isHighlight ? 'bold' : 'normal',
                      color:
                        theme === 'light'
                          ? isPink
                            ? 'var(--color-vector-magenta-bright)'
                            : 'color-mix(in srgb, var(--color-vector-ink-strong) 50%, transparent)'
                          : isPink
                            ? 'var(--color-vector-magenta-bright)'
                            : 'color-mix(in srgb, var(--color-cyan-400) 80%, transparent)',
                      textShadow:
                        isPink && theme === 'dark'
                          ? '0 0 10px color-mix(in srgb, var(--color-vector-magenta-bright) 30%, transparent)'
                          : 'none',
                    }}
                  >
                    <span
                      className={`text-sm font-bold tracking-wider mr-2 ${theme === 'light' ? 'text-vector-cyan-brand/40' : 'opacity-60'}`}
                    >
                      {`【${p.source || p.date || p.year}】`}
                    </span>
                    {p.text}
                  </div>
                );
              })}
              <div
                className={`absolute inset-0 z-10 ${theme === 'light' ? 'bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-vector-fog-light)_20%,transparent)_10%,var(--color-vector-fog-light)_95%)]' : 'bg-[radial-gradient(circle_at_center,color-mix(in_srgb,_black_20%,_transparent)_10%,black_95%)]'}`}
              ></div>
            </div>

            {/* Cyber Grid Floor */}
            <div
              className={`absolute bottom-[-30%] left-[-50%] w-[200%] h-[100%] bg-[size:50px_50px] 
              [transform:perspective(500px)_rotateX(75deg)] opacity-40 animate-[grid-move_20s_linear_infinite] pointer-events-none z-0
              ${
                theme === 'light'
                  ? 'bg-[linear-gradient(transparent,color-mix(in_srgb,var(--color-vector-cyan-brand)_5%,transparent)_1px,transparent_1px),linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-vector-cyan-brand)_2%,transparent)_1px,transparent_1px)]'
                  : 'bg-[linear-gradient(transparent,color-mix(in_srgb,var(--color-vector-cyan-pure)_10%,transparent)_1px,transparent_1px),linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-vector-cyan-pure)_5%,transparent)_1px,transparent_1px)]'
              }
              ${isWarping ? 'opacity-0' : ''}
            `}
            ></div>

            {/* Main UI Content */}
            <div
              className={`relative z-20 flex flex-col items-center text-center transition-all duration-700 ${mounted && !isWarping ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-sm'}`}
            >
              <div className="mb-14 relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center [perspective:1000px]">
                <div
                  className={`absolute inset-0 border rounded-full ${theme === 'light' ? 'border-vector-cyan-brand/10' : 'border-cyan-900/30'}`}
                ></div>
                <div className="absolute inset-0 animate-[spin_60s_linear_infinite]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 left-1/2 w-[1px] h-3 origin-bottom transform -translate-x-1/2 ${theme === 'light' ? 'bg-cyan-200' : 'bg-cyan-700'}`}
                      style={{ transform: `rotate(${i * 30}deg) translateY(0)` }}
                    ></div>
                  ))}
                  <div
                    className={`absolute inset-4 border border-dashed rounded-full ${theme === 'light' ? 'border-cyan-200/40' : 'border-cyan-800/40'}`}
                  ></div>
                </div>
                <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
                  <div
                    className={`absolute top-1/2 left-1/2 w-1/2 h-1 origin-left animate-[radar-spin_4s_linear_infinite] ${theme === 'light' ? 'bg-gradient-to-r from-transparent to-cyan-300' : 'bg-gradient-to-r from-transparent to-cyan-400'}`}
                  ></div>
                </div>
                <div
                  className={`absolute inset-10 border-2 rounded-full animate-[spin-z_10s_linear_infinite] ${theme === 'light' ? 'border-t-cyan-400 border-l-cyan-400/20 border-r-cyan-400/20 border-b-cyan-400' : 'border-t-cyan-500 border-l-cyan-500/20 border-r-cyan-500/20 border-b-cyan-500'}`}
                >
                  <div
                    className={`absolute top-0 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${theme === 'light' ? 'bg-cyan-400' : 'bg-cyan-400'}`}
                  ></div>
                </div>
                <div
                  className={`absolute inset-16 border-[3px] rounded-full animate-[spin-x_8s_linear_infinite] [transform-style:preserve-3d] ${theme === 'light' ? 'border-cyan-400/20' : 'border-vector-magenta-bright/10 shadow-glow-magenta'}`}
                >
                  <div
                    className={`absolute inset-0 border-t-4 rounded-full blur-[1px] ${theme === 'light' ? 'border-t-cyan-400/40' : 'border-t-[var(--color-vector-magenta-bright)]/40 shadow-[0_0_10px_color-mix(in_srgb,var(--color-vector-magenta-bright)_20%,transparent)]'}`}
                  ></div>
                </div>
                <div
                  className={`absolute inset-20 border rounded-full animate-[spin-y_12s_linear_infinite] [transform-style:preserve-3d] ${theme === 'light' ? 'border-blue-400/20' : 'border-vector-magenta-bright/20'}`}
                >
                  <div
                    className={`absolute inset-0 border-l-4 rounded-full ${theme === 'light' ? 'border-l-blue-400/40' : 'border-l-[var(--color-vector-magenta-bright)]/30 shadow-glow-magenta'}`}
                  ></div>
                </div>
                <div className="relative z-10 w-16 h-16 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full blur-md animate-pulse ${theme === 'light' ? 'bg-white' : 'bg-white/80'}`}
                  ></div>
                  <div
                    className={`absolute inset-[-4px] rounded-full blur-lg animate-ping ${theme === 'light' ? 'bg-cyan-400/20' : 'bg-cyan-400/50'}`}
                  ></div>
                  <div
                    className={`absolute inset-0 border-2 bg-black/50 rounded-full flex items-center justify-center ${theme === 'light' ? 'border-vector-cyan-brand bg-white' : 'border-white bg-black/50'}`}
                  >
                    <Cpu
                      className={`w-8 h-8 animate-pulse ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-cyan-200'}`}
                    />
                  </div>
                </div>
                <div className="absolute -right-6 top-12 flex flex-col items-start gap-1">
                  <div
                    className={`flex items-center gap-2 text-xs font-mono pl-3 ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-cyan-400'}`}
                  >
                    <Cpu
                      className={`w-4 h-4 animate-pulse ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-cyan-400'}`}
                    />
                    {language === 'zh' ? '认知已同步' : 'Consciousness Synced'}
                  </div>
                </div>
                <div className="absolute -left-12 bottom-10 flex flex-col items-end gap-1">
                  <div
                    className={`flex items-center gap-1 text-[9px] font-mono border-r-2 pr-2 pl-1 py-0.5 backdrop-blur-sm ${theme === 'light' ? 'text-blue-600 border-blue-500 bg-white/60' : 'text-cyan-300 border-vector-magenta-bright bg-black/60 shadow-glow-magenta-soft'}`}
                  >
                    <Scan className="w-3 h-3" />{' '}
                    {language === 'zh' ? '观测系统连接' : 'Observation Active'}
                  </div>
                </div>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
                  viewBox="0 0 320 320"
                >
                  <line
                    x1="160"
                    y1="160"
                    x2="280"
                    y2="80"
                    stroke={
                      theme === 'light'
                        ? 'var(--color-vector-cyan-brand)'
                        : 'var(--color-vector-cyan-pure)'
                    }
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <line
                    x1="160"
                    y1="160"
                    x2="40"
                    y2="240"
                    stroke={
                      theme === 'light'
                        ? 'var(--color-vector-blue-deep)'
                        : 'var(--color-vector-magenta-bright)'
                    }
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx="280"
                    cy="80"
                    r="2"
                    fill={
                      theme === 'light'
                        ? 'var(--color-vector-cyan-brand)'
                        : 'var(--color-vector-cyan-pure)'
                    }
                  />
                  <circle
                    cx="40"
                    cy="240"
                    r="2"
                    fill={
                      theme === 'light'
                        ? 'var(--color-vector-blue-deep)'
                        : 'var(--color-vector-magenta-bright)'
                    }
                  />
                </svg>
              </div>

              <h1
                className={`text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter mb-2 glitch-text mix-blend-overlay ${theme === 'light' ? 'text-vector-ink-strong' : 'text-white'}`}
                data-text="VECTOR"
              >
                VECTOR
              </h1>
              <div
                className={`flex items-center gap-4 font-bold text-xl md:text-3xl tracking-[0.6em] uppercase mb-12 relative ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-indigo-400'}`}
              >
                <span
                  className={`h-[1px] w-8 ${theme === 'light' ? 'bg-vector-cyan-brand/30' : 'bg-indigo-500/30'}`}
                ></span>
                <span className={`${theme === 'light' ? 'text-vector-ink-strong' : 'text-white'}`}>
                  {t.vectorLife}
                </span>
                <span
                  className={`h-[1px] w-8 ${theme === 'light' ? 'bg-vector-cyan-brand/30' : 'bg-indigo-500/30'}`}
                ></span>
              </div>

              <div
                className={`max-w-md mb-12 relative group cursor-default backdrop-blur-md p-6 border-y transition-all duration-500 ${theme === 'light' ? 'bg-white/60 border-vector-cyan-brand/10 hover:border-vector-cyan-brand/30 shadow-md' : 'bg-black/80 border-cyan-900/40 hover:border-cyan-500/40 shadow-2xl'}`}
              >
                <p
                  className={`font-mono text-sm leading-relaxed tracking-wide relative z-10 ${theme === 'light' ? 'text-vector-slate-mid' : 'text-cyan-100/90'}`}
                >
                  <DecryptionText text={t.defineMagnitude} speed={25} />
                  <br />
                  <span
                    className={`text-[10px] mt-4 block uppercase tracking-[0.25em] flex items-center justify-center gap-2 ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-cyan-500'}`}
                  >
                    <Globe className="w-3 h-3" /> {t.globalPosition}
                  </span>
                </p>
              </div>

              <div className="group relative">
                <div
                  className={`absolute -inset-1 rounded-lg blur opacity-20 group-hover:opacity-80 transition duration-500 ${theme === 'light' ? 'bg-gradient-to-r from-vector-cyan-brand to-blue-600' : 'bg-gradient-to-r from-cyan-600 to-indigo-600'}`}
                ></div>
                <CyberButton
                  data-testid="cover-initialize"
                  onClick={handleInitialize}
                  className={`!px-8 md:!px-16 !py-4 md:!py-5 text-xl relative ${theme === 'light' ? 'bg-white border-vector-cyan-brand/30' : 'bg-black border-cyan-500/50'}`}
                  theme={theme}
                >
                  <span className="flex items-center gap-3 relative z-10">
                    <Zap
                      className={`w-5 h-5 transition-colors ${theme === 'light' ? 'group-hover:text-yellow-500' : 'group-hover:text-yellow-400'}`}
                    />
                    {t.initialize}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                </CyberButton>
              </div>
            </div>

            {isWarping && (
              <div
                className={`absolute inset-0 opacity-0 animate-[flash_1.2s_ease-in-out_forwards] pointer-events-none z-50 ${theme === 'light' ? 'bg-vector-fog-light' : 'bg-white'}`}
              ></div>
            )}

            <style>{`
              @keyframes scroll-wall {
                0% { transform: perspective(1000px) rotateX(15deg) rotateZ(-5deg) translateY(0); }
                50% { transform: perspective(1000px) rotateX(15deg) rotateZ(-5deg) translateY(-10%); }
                100% { transform: perspective(1000px) rotateX(15deg) rotateZ(-5deg) translateY(-20%); }
              }
              @keyframes warp-speed {
                0% { transform: perspective(1000px) rotateX(15deg) rotateZ(-5deg) translateY(0) scale(1); opacity: 0.8; }
                100% { transform: perspective(1000px) rotateX(0deg) rotateZ(0deg) translateY(-50%) scale(5); opacity: 0; filter: blur(20px); }
              }
              @keyframes grid-move {
                 0% { background-position: 0 0; }
                 100% { background-position: 0 50px; }
              }
              @keyframes flash {
                0% { opacity: 0; }
                40% { opacity: 0.9; }
                100% { opacity: 1; background: ${theme === 'light' ? 'var(--color-vector-fog-light)' : 'black'}; }
              }
              @keyframes nebula-drift {
                 0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
                 100% { transform: translate(5%, 10%) scale(1.1); opacity: 0.6; }
              }
              @keyframes spin-z { 0% { transform: rotateZ(0deg); } 100% { transform: rotateZ(360deg); } }
              @keyframes spin-x { 0% { transform: rotateX(0deg) rotateZ(0deg); } 50% { transform: rotateX(180deg) rotateZ(180deg); } 100% { transform: rotateX(360deg) rotateZ(360deg); } }
              @keyframes spin-y { 0% { transform: rotateY(0deg) rotateZ(45deg); } 100% { transform: rotateY(360deg) rotateZ(45deg); } }
              @keyframes radar-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        );

      case 'GATE':
        return (
          <div
            className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-1000 ${theme === 'light' ? 'bg-vector-fog-light' : 'bg-black'}`}
          >
            <div
              className={`relative w-full max-w-lg border p-12 transition-all duration-700 ${theme === 'light' ? 'bg-white/80 border-vector-cyan-brand/10 shadow-xl' : 'bg-vector-ink-deep border-cyan-900/40 shadow-2xl'}`}
            >
              <div
                className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${theme === 'light' ? 'border-vector-cyan-brand' : 'border-cyan-500'}`}
              ></div>
              <div
                className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${theme === 'light' ? 'border-vector-cyan-brand' : 'border-cyan-500'}`}
              ></div>
              <div
                className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${theme === 'light' ? 'border-vector-cyan-brand' : 'border-cyan-500'}`}
              ></div>
              <div
                className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${theme === 'light' ? 'border-vector-cyan-brand' : 'border-cyan-500'}`}
              ></div>

              <div className="flex flex-col items-center gap-8">
                <div
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center animate-pulse ${theme === 'light' ? 'border-vector-cyan-brand/20' : 'border-cyan-500/20'}`}
                >
                  <ShieldCheck
                    className={`w-8 h-8 ${theme === 'light' ? 'text-vector-cyan-brand' : 'text-cyan-500'}`}
                  />
                </div>
                <div className="text-center space-y-4">
                  <h1
                    className={`text-4xl font-bold tracking-[0.4em] uppercase ${theme === 'light' ? 'text-vector-ink-strong' : 'text-white'}`}
                  >
                    VECTOR_GATE
                  </h1>
                  <p
                    className={`font-mono text-xs uppercase tracking-widest ${theme === 'light' ? 'text-vector-cyan-brand/60' : 'text-cyan-800'}`}
                  >
                    {t.secureLinkEstablished}
                  </p>
                </div>
                <CyberButton
                  data-testid="cover-initialize"
                  onClick={onStart}
                  variant="primary"
                  className="w-full py-4"
                  theme={theme}
                >
                  {t.initialize}
                </CyberButton>
              </div>
            </div>
          </div>
        );

      case 'TERMINAL':
        return (
          <div
            className={`min-h-screen p-8 font-mono transition-colors duration-1000 ${theme === 'light' ? 'bg-vector-fog-light text-vector-cyan-brand' : 'bg-black text-cyan-500'}`}
          >
            <div className="max-w-2xl mx-auto space-y-2">
              <div className="animate-pulse">{t.bootSequence}</div>
              <div className="opacity-60">{t.mountingFilesystem}</div>
              <div className="opacity-60">{t.initializingLink}</div>
              <div className="opacity-60">{t.decryptingVault}</div>
              <div
                className={`mt-8 ${theme === 'light' ? 'text-vector-ink-strong opacity-100' : 'opacity-80'}`}
              >
                {t.welcomeCommander}
              </div>
              <div className="mt-12">
                <CyberButton
                  data-testid="cover-initialize"
                  onClick={onStart}
                  variant="ghost"
                  className={`border-cyan-900 hover:border-cyan-500 ${theme === 'light' ? 'border-vector-cyan-brand/30 hover:border-vector-cyan-brand' : ''}`}
                  theme={theme}
                >
                  {t.initialize}
                </CyberButton>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`relative min-h-screen transition-colors duration-1000 ${theme === 'light' ? 'bg-vector-fog-light' : 'bg-black'}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={version}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="min-h-screen"
        >
          {renderVersion()}
        </motion.div>
      </AnimatePresence>

      {/* Version Switcher */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 border p-2 rounded-full backdrop-blur-md shadow-2xl transition-all duration-700 ${theme === 'light' ? 'bg-white/80 border-vector-cyan-brand/10' : 'bg-black/80 border-cyan-900/50'}`}
      >
        <button
          data-testid="cover-version-star-tunnel"
          onClick={() => setVersion('STAR_TUNNEL')}
          className={`p-2 rounded-full transition-all ${version === 'STAR_TUNNEL' ? (theme === 'light' ? 'bg-vector-cyan-brand text-white shadow-md' : 'bg-cyan-500 text-black') : theme === 'light' ? 'text-slate-400 hover:text-vector-cyan-brand' : 'text-cyan-800 hover:text-cyan-500'}`}
          title={t.starTunnelTitle}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          data-testid="cover-version-warp-speed"
          onClick={() => setVersion('WARP_SPEED')}
          className={`p-2 rounded-full transition-all ${version === 'WARP_SPEED' ? (theme === 'light' ? 'bg-vector-cyan-brand text-white shadow-md' : 'bg-cyan-500 text-black') : theme === 'light' ? 'text-slate-400 hover:text-vector-cyan-brand' : 'text-cyan-800 hover:text-cyan-500'}`}
          title={t.warpSpeedTitle}
        >
          <Zap className="w-4 h-4" />
        </button>
        <button
          data-testid="cover-version-gate"
          onClick={() => setVersion('GATE')}
          className={`p-2 rounded-full transition-all ${version === 'GATE' ? (theme === 'light' ? 'bg-vector-cyan-brand text-white shadow-md' : 'bg-cyan-500 text-black') : theme === 'light' ? 'text-slate-400 hover:text-vector-cyan-brand' : 'text-cyan-800 hover:text-cyan-500'}`}
          title={t.gateTitle}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          data-testid="cover-version-terminal"
          onClick={() => setVersion('TERMINAL')}
          className={`p-2 rounded-full transition-all ${version === 'TERMINAL' ? (theme === 'light' ? 'bg-vector-cyan-brand text-white shadow-md' : 'bg-cyan-500 text-black') : theme === 'light' ? 'text-slate-400 hover:text-vector-cyan-brand' : 'text-cyan-800 hover:text-cyan-500'}`}
          title={t.terminalTitle}
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
