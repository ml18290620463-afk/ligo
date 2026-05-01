import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldCheck, AlertTriangle, Mail, Fingerprint, Scan, Key, BarChart3, Download, Wind, Clock } from 'lucide-react';
import Markdown, { Components } from 'react-markdown';
import { DiaryEntry, Language, MorningStarPersona, Theme, Container } from '../types';
import { CyberButton } from './CyberButton';
import { DecryptionText } from './DecryptionText';
import { AppStorageKeys } from '../services/appSettings';
import { getStoredString } from '../services/browserStorage';
import { getMorningStarAnalysis } from '../services/geminiService';
import { SecurityService } from '../services/securityService';
import { getInitialViewerAccessState } from '../services/viewerAccessState';
import { downloadTextFile } from '../services/fileDownload';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { createSeededRandom } from '../lib/random';
import { TRANSLATIONS, APP_VERSION } from '../constants';
import { DeepArchiveAnimation } from './DeepArchiveAnimation';
import { MorningStarPanel } from './MorningStarPanel';
import { ViewerAttachmentPanel } from './ViewerAttachmentPanel';
import { ViewerActionFooter } from './ViewerActionFooter';

const getInitialMorningStarPersonas = (entry: DiaryEntry, guidingStars: string[]) => {
  if (entry.morningStarPersonas && entry.morningStarPersonas.length > 0) {
    return entry.morningStarPersonas;
  }
  if (guidingStars.length > 0) {
    return guidingStars;
  }
  return ['Marcus Aurelius'];
};

const getInitialReadingStep = (entry: DiaryEntry) => (
  entry.morningStarAnalysis ? 'evaluation' : 'reading'
);

interface ViewerProps {
  language: Language;
  theme: Theme;
  entry: DiaryEntry;
  currentUser: string | null;
  masterPassword: string | null;
  guidingStars: string[];
  onBack: () => void;
  onGoHome?: () => void;
  onUpdateEntry: (updatedEntry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  containers: Container[];
}

const MarkdownComponents = (theme: Theme): Components => ({
  a: ({ node, ...props }) => {
    const { href, children } = props;
    const label = String(children).toLowerCase();
    
    if (label === 'video') {
      return (
        <div className="my-6">
          <video 
            src={href} 
            controls 
            className={`w-full max-h-[500px] rounded-lg border shadow-2xl ${theme === 'light' ? 'border-slate-200' : 'border-cyan-500/30'}`} 
          />
        </div>
      );
    }
    if (label === 'audio') {
      return (
        <div className="my-4 p-4 rounded-lg border bg-black/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-500/70">
            <Wind className="w-3 h-3 animate-pulse" /> AUDIO_STREAM_DECODED
          </div>
          <audio src={href} controls className="w-full" />
        </div>
      );
    }
    if (label === 'pdf' || label === 'paf') {
      return (
        <div className="my-6 w-full h-[600px] border rounded-lg overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full p-2 bg-black/60 backdrop-blur-md border-b border-white/10 z-10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Document_Viewer_Active</span>
            <a href={href} download className="text-[10px] font-mono text-white hover:text-cyan-400 underline">Download_Raw</a>
          </div>
          <iframe src={href} className="w-full h-full bg-white" title="Document Viewer" />
        </div>
      );
    }
    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4" />;
  },
  img: ({ node, ...props }) => {
    return (
      <div className="my-8 relative group">
        <div className={`absolute -inset-1 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${theme === 'light' ? 'bg-cyan-600' : 'bg-cyan-400'}`}></div>
        <img 
          {...props} 
          className={`relative max-w-full h-auto rounded-lg border shadow-2xl transition-transform duration-500 group-hover:scale-[1.01] ${theme === 'light' ? 'border-slate-200' : 'border-cyan-500/30'}`} 
          referrerPolicy="no-referrer" 
        />
      </div>
    );
  }
});

const TypewriterText: React.FC<{ text: string, speed?: number, className?: string }> = ({ text, speed = 30, className }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <div className={`whitespace-pre-wrap ${className}`}>{displayedText}</div>;
};

export const Viewer: React.FC<ViewerProps> = ({ language, theme, entry, currentUser, masterPassword, guidingStars, onBack, onGoHome, onUpdateEntry, onDelete, onArchive, onRestore, containers }) => {
  const t = TRANSLATIONS[language];
  const [now, setNow] = useState(Date.now());
  const isTimeLocked = entry.unlockAt ? now < entry.unlockAt : false;
  const { scheduleTimeout, clearScheduledTimeouts } = useTimeoutManager();
  const displayIdentity = useMemo(() => getStoredString(AppStorageKeys.customIdentity)?.slice(0, 15) || 'GUEST_01', []);
  const fixedStars = useMemo(
    () => Array.from({ length: 80 }, (_, i) => {
      const random = createSeededRandom(`fixed-${entry.id}-${i}`);
      return {
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        opacity: random() * 0.4,
      };
    }),
    [entry.id]
  );
  const twinklingStars = useMemo(
    () => Array.from({ length: 30 }, (_, i) => {
      const random = createSeededRandom(`twinkle-${entry.id}-${i}`);
      return {
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        duration: 4 + random() * 6,
        delay: random() * 5,
      };
    }),
    [entry.id]
  );
  const rippleStars = useMemo(
    () => Array.from({ length: 8 }, (_, i) => {
      const random = createSeededRandom(`ripple-${entry.id}-${i}`);
      return {
        top: `${10 + random() * 40}%`,
        right: `${10 + random() * 40}%`,
        duration: 2 + random() * 2,
        delay: random() * 5,
      };
    }),
    [entry.id]
  );
  const decodedStars = useMemo(
    () => Array.from({ length: 6 }, (_, i) => {
      const random = createSeededRandom(`decoded-${entry.id}-${i}`);
      return {
        top: `${random() * 60}%`,
        right: `${random() * 60}%`,
        duration: 2 + random() * 2,
        delay: random() * 4,
      };
    }),
    [entry.id]
  );

  const [viewState, setViewState] = useState<'sealed' | 'opening' | 'reading'>(() =>
    getInitialViewerAccessState(entry, masterPassword).viewState
  );

  const [decrypted, setDecrypted] = useState(() =>
    getInitialViewerAccessState(entry, masterPassword).decrypted
  );
  const [showPackingMenu, setShowPackingMenu] = useState(false);

  const handleMoveToContainer = (containerId: string | undefined) => {
    onUpdateEntry({ ...entry, containerId });
    setShowPackingMenu(false);
  };
  
  const parsedAnalysis = React.useMemo(() => {
    if (!entry.morningStarAnalysis) return null;
    try {
      const parsed = JSON.parse(entry.morningStarAnalysis);
      if (parsed.content && parsed.metrics) return parsed;
      return { content: entry.morningStarAnalysis, metrics: {} };
    } catch (e) {
      return { content: entry.morningStarAnalysis, metrics: {} };
    }
  }, [entry.morningStarAnalysis]);

  const [decryptedContent, setDecryptedContent] = useState<string>(() =>
    getInitialViewerAccessState(entry, masterPassword).decryptedContent
  );
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [decryptionPassword, setDecryptionPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Biometric States
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30000; // 30 seconds

  // Check biometric availability
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        }
      } catch (e) {
        setBiometricAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  const handleBiometricAuth = async () => {
    if (isTimeLocked) {
      setDecryptionError(t.notReady || "时间未到，坐标锁定中");
      triggerShake();
      return;
    }

    if (isScanning || lockoutUntil) return;
    
    setIsScanning(true);
    setBiometricError(null);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: "VECTOR_TRACE" },
          user: {
            id: new Uint8Array(16),
            name: "local-user",
            displayName: "Local User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      };

      await navigator.credentials.create(options);
      
      // Success - Proceed to open
      setViewState('opening');
      setDecryptionError(null);
      setFailedAttempts(0);
      
      let content = entry.content;
      if (entry.isEncrypted && masterPassword) {
        content = await SecurityService.decrypt(entry.content, masterPassword);
      }
      
      scheduleTimeout(() => {
          setDecryptedContent(content);
          setViewState('reading');
          setDecrypted(true);
          setIsScanning(false);
      }, 1200);
    } catch (err: unknown) {
      console.error("Biometric error:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setBiometricError(t.biometricRestricted || "Environment Restricted");
      } else {
        setBiometricError(err instanceof Error ? err.message : "Auth Failed");
      }
      setIsScanning(false);
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    scheduleTimeout(() => setIsShaking(false), 500);
  };
  
  // Morning Star Analysis
  const [morningStarPersonas, setMorningStarPersonas] = useState<string[]>(getInitialMorningStarPersonas(entry, guidingStars));
  const [morningStarLoading, setMorningStarLoading] = useState(false);
  const [morningStarError, setMorningStarError] = useState<string | null>(null);
  
  // Destruction State
  const [burnMode, setBurnMode] = useState<'idle' | 'confirm' | 'igniting' | 'burning' | 'ashed'>('idle');
  
  // Archival/Restore State
  const [archiveState, setArchiveState] = useState<'idle' | 'scanning' | 'uploading' | 'completed'>('idle');

  // Workflow Step: 'reading' (Initial) -> 'reflecting' (Writing) -> 'evaluation' (AI Feedback)
  const [readingStep, setReadingStep] = useState<'reading' | 'reflecting' | 'evaluation'>(() => getInitialReadingStep(entry));

  useEffect(() => {
    if (!isTimeLocked) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTimeLocked]);

  const getTimeLeft = () => {
    if (!entry.unlockAt) return null;
    const diff = entry.unlockAt - now;
    if (diff <= 0) return null;
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    return { d, h, m, s };
  };

  const timeLeft = getTimeLeft();

  const [reflectionText, setReflectionText] = useState(entry.reflection || '');

  // Reset state when entry changes
  useEffect(() => {
    clearScheduledTimeouts();
    const initialAccessState = getInitialViewerAccessState(entry, masterPassword);
    setViewState(initialAccessState.viewState);
    setDecrypted(initialAccessState.decrypted);
    setDecryptedContent(initialAccessState.decryptedContent);
    setDecryptionError(null);
    setBurnMode('idle');
    setArchiveState('idle');
    setDecryptionPassword('');
    setFailedAttempts(0);
    setLockoutUntil(null);
    setIsScanning(false);
    setBiometricError(null);
    setMorningStarPersonas(getInitialMorningStarPersonas(entry, guidingStars));
    setMorningStarLoading(false);
    setMorningStarError(null);
    setReadingStep(getInitialReadingStep(entry));
    setReflectionText(entry.reflection || '');
  }, [clearScheduledTimeouts, entry.id, entry.isEncrypted, entry.content, entry.reflection, entry.morningStarAnalysis, entry.morningStarPersonas, entry.unlockAt, guidingStars, masterPassword]);

  useEffect(() => {
    if (viewState === 'opening' || isTimeLocked) {
      return;
    }

    const initialAccessState = getInitialViewerAccessState(entry, masterPassword, now);
    if (
      initialAccessState.viewState !== viewState ||
      initialAccessState.decrypted !== decrypted ||
      initialAccessState.decryptedContent !== decryptedContent
    ) {
      setViewState(initialAccessState.viewState);
      setDecrypted(initialAccessState.decrypted);
      setDecryptedContent(initialAccessState.decryptedContent);
    }
  }, [decrypted, decryptedContent, entry.content, entry.id, entry.isEncrypted, entry.unlockAt, isTimeLocked, masterPassword, now, viewState]);

  // Clear error when typing
  useEffect(() => {
    if (decryptionError) setDecryptionError(null);
  }, [decryptionPassword]);

  useEffect(() => {
    if (morningStarError && reflectionText.trim()) {
      setMorningStarError(null);
    }
  }, [reflectionText, morningStarError]);

  const handleOpenLetter = async () => {
    // 【核心安全点 0：绝对时间锁校验】
    // 必须首先检查时间锁，任何绕过时间锁的操作都是非法的
    if (isTimeLocked) {
      setDecryptionError(t.notReady || "时间未到，坐标锁定中");
      triggerShake();
      return;
    }

    if (viewState !== 'sealed') return;

    // 检查锁定状态
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setDecryptionError(t.tooManyAttempts);
      triggerShake();
      return;
    }

    /**
     * 【核心安全点 1：原子化校验中枢】
     * 无论文档是否加密，只要系统设置了主控密钥，进入机密视图必须经过校验。
     */
    // 1. 基础防御：空输入拦截
    if (!decryptionPassword.trim()) {
      setDecryptionError(t.privateKeyRequired);
      triggerShake();
      return;
    }
    
    // 2. 严格校验：未加密文件仅作统一体验的校验
    if (!entry.isEncrypted) {
      if (masterPassword && decryptionPassword !== masterPassword) {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);

        if (newFailed >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION);
          scheduleTimeout(() => setLockoutUntil(null), LOCKOUT_DURATION);
          setDecryptionError(t.tooManyAttempts);
        } else {
          setDecryptionError(t.decryptionFailed);
        }

        setDecryptionPassword('');
        triggerShake();
        return;
      }
    }
    
    // 校验通过：进入解密序列
    setViewState('opening');
    setDecryptionError(null);
    setFailedAttempts(0); // 重置尝试次数
    
    try {
      let content = entry.content;
      if (entry.isEncrypted) {
        // 执行实际解密运算
        content = await SecurityService.decrypt(entry.content, decryptionPassword);
      }
      
      // 增加仪式感延迟，模拟数据提取过程
      scheduleTimeout(() => {
          /**
           * 【核心安全点 2：状态驱动渲染】
           * 只有在解密成功且状态变更为 'reading' 后，敏感内容才会被渲染到 DOM 中。
           */
          setDecryptedContent(content);
          setViewState('reading');
          setDecrypted(true);
      }, 1200);
    } catch (err) {
      console.error("Decryption failed", err);
      
      const newFailed = failedAttempts + 1;
      setFailedAttempts(newFailed);

      if (newFailed >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION);
        scheduleTimeout(() => setLockoutUntil(null), LOCKOUT_DURATION);
        setDecryptionError(t.tooManyAttempts);
      } else {
        setDecryptionError(t.decryptionFailed);
      }

      setViewState('sealed');
      setDecryptionPassword('');
      triggerShake();
    }
  };

  const handleMorningStarAnalysis = async () => {
    if (morningStarLoading || !reflectionText.trim() || morningStarPersonas.length === 0) {
      return;
    }

    setMorningStarLoading(true);
    setMorningStarError(null);
    setReadingStep('evaluation');
    try {
      const contentToAnalyze = decryptedContent || entry.content;
      const result = await getMorningStarAnalysis(contentToAnalyze, reflectionText, morningStarPersonas);
      const updated = { 
        ...entry, 
        morningStarAnalysis: result,
        morningStarPersonas: morningStarPersonas,
        reflection: reflectionText
      };
      onUpdateEntry(updated);
    } catch (error) {
      console.error("Morning Star Analysis failed:", error);
      setMorningStarError(language === 'zh' ? '启明星连接暂时不稳定，请稍后再试。' : 'Morning Star is temporarily unavailable. Please try again.');
    } finally {
      setMorningStarLoading(false);
    }
  };

  const handleDeleteAnalysis = () => {
    const updated = { 
      ...entry, 
      morningStarAnalysis: undefined,
      morningStarPersonas: undefined,
      reflection: ''
    };
    onUpdateEntry(updated);
    setReadingStep('reading');
    setReflectionText('');
    setMorningStarError(null);
  };

  // --- BURN LOGIC ---
  const initBurn = () => setBurnMode('confirm');
  const cancelBurn = () => setBurnMode('idle');
  const executeBurn = () => {
    setBurnMode('igniting');
    scheduleTimeout(() => setBurnMode('burning'), 800);
    scheduleTimeout(() => {
      setBurnMode('ashed');
      scheduleTimeout(() => onDelete(entry.id), 1000);
    }, 3000);
  };

  // --- ARCHIVE LOGIC ---
  const executeArchiveOrRestore = async () => {
    if (archiveState !== 'idle') return;
    
    setArchiveState('scanning');
    
    setArchiveState('uploading');

    // The DeepArchiveAnimation takes 3 seconds
    scheduleTimeout(() => {
      setArchiveState('completed');
      scheduleTimeout(() => {
        if (entry.isArchived) {
            onRestore(entry.id);
        } else {
            // Save the entry when archiving
            const updatedEntry = { 
                ...entry, 
                isArchived: true
            };
            onUpdateEntry(updatedEntry);
            onArchive(entry.id);
        }
      }, 800);
    }, 3000); // Wait for the 3s animation
  };

  const handleDownload = () => {
    downloadTextFile(decryptedContent, `${entry.title}.txt`);
  };

  const getContainerStyles = () => {
    if (burnMode === 'igniting' || burnMode === 'burning') {
        return 'brightness-150 contrast-125 sepia-100 hue-rotate-[-50deg]';
    }
    if (burnMode === 'ashed') {
        return 'grayscale brightness-0 opacity-0 scale-90 blur-md';
    }
    if (archiveState !== 'idle') {
       switch (archiveState) {
         case 'scanning': return 'relative after:absolute after:inset-0 after:bg-green-500/10 after:z-10';
         case 'uploading': return 'opacity-50 scale-95 blur-[1px] hue-rotate-[50deg] translate-y-[-20px] transition-all duration-[2000ms]';
         case 'completed': return 'opacity-0 scale-0 transition-all duration-500';
         default: return '';
       }
    }
    return '';
  };

  return (
    <div className={`relative min-h-screen overflow-hidden flex flex-col items-center transition-colors duration-1000 ${theme === 'light' ? 'bg-[#f0f4f7]' : 'bg-[#030303]'}`}>
      {/* Starry Sky Background (Global) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Nebula Gradients */}
        <div className={`absolute inset-0 opacity-30 ${theme === 'light' ? 'bg-[radial-gradient(circle_at_20%_30%,rgba(0,122,140,0.08),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.04),transparent_50%)]' : 'bg-[radial-gradient(circle_at_20%_30%,rgba(6,182,212,0.12),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.06),transparent_50%)]'}`} />
        
        {/* Fixed Stars */}
        <div className="absolute inset-0">
          {fixedStars.map((star, i) => (
            <div 
              key={`star-fix-${i}`}
              className={`absolute w-px h-px rounded-full ${theme === 'light' ? 'bg-slate-400' : 'bg-white/30'}`}
              style={star}
            />
          ))}
        </div>

        {/* Twinkling Stars */}
        <div className="absolute inset-0">
          {twinklingStars.map((star, i) => (
            <motion.div 
              key={`star-twinkle-${i}`}
              animate={{ 
                opacity: [0.1, 0.7, 0.1],
                scale: [0.8, 1.1, 0.8]
              }}
              transition={{ 
                duration: star.duration, 
                repeat: Infinity, 
                delay: star.delay 
              }}
              className={`absolute w-[2px] h-[2px] rounded-full blur-[1px] ${theme === 'light' ? 'bg-cyan-600/60' : 'bg-cyan-300/60'}`}
              style={{ left: star.left, top: star.top }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewState !== 'reading' && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0, scale: 1.1, filter: 'blur(30px)' }}
             transition={{ duration: 1.2 }}
             className={`fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 backdrop-blur-3xl overflow-y-auto transition-colors duration-1000 ${theme === 'light' ? 'bg-[#fafafa]/40' : 'bg-[#030303]/40'}`}
           >
              {/* Data Stream Lines */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ left: '-100%' }}
                    animate={{ left: '200%' }}
                    transition={{ 
                      duration: 10 + i * 2, 
                      repeat: Infinity, 
                      ease: "linear",
                      delay: i * 3
                    }}
                    className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent top-0"
                    style={{ top: `${20 * i}%`, transform: `rotate(${5 * (i % 2 === 0 ? 1 : -1)}deg)` }}
                  />
                ))}
              </div>

              <div className="relative w-full max-w-[380px] md:max-w-[420px] perspective-[3000px] z-10 px-4 md:px-0 my-auto">
                 {/* Traditional Greeting Removed */}

                  <motion.div 
                     whileHover={{ 
                          x: [0, -1, 1, -1, 1, 0],
                          rotate: [0, -0.5, 0.5, -0.5, 0],
                          transition: { duration: 0.4 }
                        }}
                        whileTap={{ 
                          scale: 0.98,
                          x: [0, -2, 2, -2, 2, 0],
                          transition: { duration: 0.2 }
                        }}
                        animate={viewState === 'opening' ? {
                          rotateX: 110,
                          rotateY: [0, 45, -45, 0],
                          z: 800,
                          opacity: 0,
                          scale: [1, 2, 3],
                          skewX: [0, 40, -40, 0],
                          skewY: [0, -20, 20, 0],
                          filter: ["blur(0px)", "blur(20px)", "blur(40px)"],
                        } : { 
                          y: [0, -8, 0],
                          rotateY: [-1, 1, -1],
                          rotateX: [0.5, -0.5, 0.5]
                        }}
                        transition={viewState === 'opening' ? {
                          duration: 2.5,
                          ease: "circIn",
                          skewX: { duration: 1.2, repeat: 1 },
                          skewY: { duration: 1.2, repeat: 1 }
                        } : { 
                          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                          rotateY: { duration: 12, repeat: Infinity, ease: "easeInOut" },
                          rotateX: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className={`
                          relative transition-all duration-1000 group rounded-sm
                          ${theme === 'light' ? 'bg-[#faf9f6] shadow-[0_0_60px_rgba(0,122,140,0.1)] border border-cyan-500/20' : 'bg-[#0a0a0a] border border-cyan-500/40 neon-border-cyan shadow-[0_0_90px_rgba(6,182,212,0.2),inset_0_0_40px_rgba(6,182,212,0.1)]'}
                          ${viewState === 'opening' ? 'pointer-events-none' : ''}
                        `} 
                  >
                    {/* Back Button (Moved to Top Left Corner) */}
                    <div className="absolute -top-4 -left-4 z-50">
                       <button 
                         onClick={onBack} 
                         aria-label={t.abort}
                         className={`w-12 h-12 rounded-full border transition-all flex items-center justify-center group backdrop-blur-md shadow-lg ${theme === 'light' ? 'text-slate-400 border-slate-200 hover:text-slate-900 hover:border-slate-400 bg-white/80' : 'text-cyan-500/60 border-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50 bg-black/60 shadow-[0_0_20px_rgba(6,182,212,0.1)] neon-border-cyan'}`}
                       >
                         <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                       </button>
                    </div>
                    {/* Cyberpunk Space-Time Ripples (Enhanced with Star-field & Rose) */}
                    <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none z-40 overflow-hidden">
                        {/* Recursive Ripple Layers with Rose Accents */}
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ 
                              scale: 3.5, 
                              opacity: 0,
                            }}
                            transition={{ 
                              duration: 8, 
                              repeat: Infinity, 
                              delay: i * 2.5,
                              ease: "linear" 
                            }}
                            className={`absolute top-0 right-0 w-24 h-24 border-2 rounded-full -translate-y-1/2 translate-x-1/2 
                              ${i === 1 && theme === 'dark' ? 'border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 
                                theme === 'light' ? 'border-cyan-500/20' : 'border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]'}`}
                          />
                        ))}

                        {/* Background Twinkling Stars (Hidden behind ripples) */}
                        <div className="absolute inset-x-0 top-0 h-full z-5">
                          {rippleStars.map((star, i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                opacity: [0, 0.8, 0],
                                scale: [0.5, 1, 0.5]
                              }}
                              transition={{
                                duration: star.duration,
                                repeat: Infinity,
                                delay: star.delay,
                                ease: "easeInOut"
                              }}
                              className="absolute w-0.5 h-0.5 bg-white rounded-full bg-slate-200"
                              style={{
                                top: star.top,
                                right: star.right,
                              }}
                            />
                          ))}
                        </div>

                        {/* Core Temporal Pulse (Dual Tone) */}
                        <motion.div
                          animate={{ 
                            scale: [1, 1.15, 1],
                            opacity: [0.3, 0.7, 0.3]
                          }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                          className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 z-10 ${theme === 'light' ? 'bg-cyan-200' : 'bg-cyan-500/30'}`}
                        />
                        
                        {/* Rose Glitch Core */}
                        <motion.div
                          animate={{ 
                            opacity: [0.1, 0.5, 0.1],
                            scale: [0.8, 1.3, 0.8]
                          }}
                          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                          className="absolute top-0 right-0 w-28 h-28 blur-2xl rounded-full -translate-y-1/3 translate-x-1/3 z-11 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                        />

                        {/* Static Tech Corner Plate */}
                        <div className={`absolute top-0 right-0 w-0 h-0 border-t-[60px] border-r-[60px] border-t-transparent z-40 ${theme === 'light' ? 'border-r-white/80' : 'border-r-black/60 shadow-[-10px_10px_20px_rgba(0,0,0,0.5)]'}`} />
                        <div className={`absolute top-0 right-0 w-px h-[85px] rotate-45 origin-top-right z-50 ${theme === 'light' ? 'bg-cyan-500/30' : 'bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`} />
                    </div>

                    {/* Background Pattern & Paper Grain */}
                    <div className={`absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-multiply ${theme === 'light' ? 'bg-[url("https://www.transparenttextures.com/patterns/natural-paper.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/dark-matter.png")]'}`} />
                    <div className={`absolute inset-0 opacity-[0.03] pointer-events-none ${theme === 'light' ? 'bg-[url("https://www.transparenttextures.com/patterns/gray-lines.png")]' : ''}`} />

                    <div className="p-5 md:p-7 flex flex-col gap-4 md:gap-5 relative overflow-hidden min-h-[420px]">
                        {/* Background Decoration & Paper Texture */}
                        <div className={`absolute inset-0 pointer-events-none opacity-[0.05] ${theme === 'light' ? 'bg-[url("https://www.transparenttextures.com/patterns/handmade-paper.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/asfalt-dark.png")]'}`}></div>
                        
                        {/* Clean Orderly Header Info Section */}
                        <div className="flex flex-col gap-6 relative z-10 border-b border-black/[0.05] dark:border-white/[0.05] -mx-5 md:-mx-7 p-6 md:p-8 pt-10 md:pt-12 mb-6">
                           <div className={`font-mono text-xs md:text-sm tracking-widest leading-loose ${theme === 'light' ? 'text-slate-600' : 'text-[#22D3EE]'}`}>
                              <TypewriterText 
                                text={`✦ 时空信件加载中  。。。\n来自 ${new Date(entry.createdAt).toLocaleDateString('zh-CN')} 信件\n信件主题：${entry.title}\n签收人：${displayIdentity}`} 
                                speed={60}
                              />
                           </div>
                        </div>

                        {/* Password Field */}
                        {!isTimeLocked && (
                        <div className="relative z-20 my-0.5 md:my-1 bg-black/[0.01] dark:bg-white/[0.01] p-3 md:p-4 border border-black/[0.03] dark:border-white/[0.03]">
                           <div className="flex flex-col gap-3">
                             <div className="flex items-center justify-center gap-3">
                               <div className="w-3 h-[1px] bg-cyan-500/40" />
                               <span className="text-[7.5px] font-mono opacity-30 uppercase tracking-[0.5em] text-center">{t.securityCalibration}</span>
                               <div className="w-3 h-[1px] bg-cyan-500/40" />
                             </div>
                             
                             <div className="relative">
                               <input 
                                  autoFocus
                                  type="password"
                                  value={decryptionPassword}
                                  onChange={(e) => setDecryptionPassword(e.target.value)}
                                  placeholder="........"
                                  className={`w-full bg-transparent border-b py-3 font-mono text-xl outline-none transition-all text-center tracking-[1.1em] relative z-20 ${theme === 'light' ? 'border-slate-300 text-slate-900 focus:border-cyan-600' : 'border-white/10 text-white focus:border-cyan-500 shadow-[inset_0_0_40px_rgba(6,182,212,0.02)]'}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleOpenLetter();
                                  }}
                                />
                                {/* Input Glow */}
                                <div className="absolute inset-0 bg-cyan-500/5 blur-[40px] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                             </div>

                             <div className="flex justify-center gap-2">
                               {[...Array(6)].map((_, i) => (
                                 <motion.div 
                                   key={i}
                                   animate={decryptionPassword.length > i ? { scale: [1, 1.25, 1], opacity: 1 } : { scale: 1, opacity: 0.2 }}
                                   className={`w-1 h-1 rounded-full ${theme === 'light' ? 'bg-slate-400' : 'bg-cyan-500'}`}
                                 />
                               ))}
                             </div>
                           </div>
                        </div>
                        )}

                        {isTimeLocked && timeLeft && (
                          <div className="relative z-10 flex flex-col items-center gap-10 py-6">
                             <div className="flex gap-10">
                                {[
                                  { label: t.days, val: timeLeft.d },
                                  { label: t.hrs, val: timeLeft.h },
                                  { label: t.min, val: timeLeft.m },
                                  { label: t.sec, val: timeLeft.s }
                                ].map((t, i) => (
                                  <div key={i} className="flex flex-col items-center">
                                    <span className={`text-[8px] font-mono opacity-30 uppercase tracking-[0.3em] mb-3`}>{t.label}</span>
                                    <div className="relative">
                                      <span className="text-3xl font-black tracking-tighter opacity-90 font-mono">
                                        {t.val.toString().padStart(2, '0')}
                                      </span>
                                      <div className="absolute -inset-2 border border-cyan-500/10 rounded-sm" />
                                    </div>
                                  </div>
                                ))}
                             </div>
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-[1px] bg-indigo-500/20 shadow-[0_0_5px_rgba(99,102,241,0.2)]" />
                               <span className="text-[10px] font-mono uppercase tracking-[0.6em] text-indigo-400 font-bold animate-pulse neon-glow-indigo drop-shadow-[0_0_5px_rgba(99,102,241,0.4)]">{t.timeLock}</span>
                               <div className="w-12 h-[1px] bg-indigo-500/20 shadow-[0_0_5px_rgba(99,102,241,0.2)]" />
                             </div>
                          </div>
                        )}

                        {(decryptionError || biometricError) && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-indigo-500/10 border border-indigo-500/30 p-2 text-[8px] text-[#C85F72] font-mono text-center w-full uppercase tracking-widest mt-2 shadow-[0_0_15px_rgba(200,95,114,0.1)] neon-glow-alert"
                          >
                            {biometricError || decryptionError}
                          </motion.div>
                        )}

                        {/* Signature Line Aesthetic - Letter Sign-off removed */}

                         <div className="flex justify-center pt-4 relative z-10">
                            <motion.button 
                                 whileTap={{ scale: 0.94 }}
                                 disabled={viewState === 'opening' || !!lockoutUntil || isScanning || isTimeLocked}
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   handleOpenLetter(); 
                                 }}
                                 className="flex flex-col items-center gap-3 group/seal"
                            >
                                <div className={`relative w-20 h-20 rounded-full border flex items-center justify-center transition-all duration-1000 ${isTimeLocked ? 'opacity-20 grayscale' : 'group-hover/seal:border-cyan-400 group-hover/seal:bg-cyan-500/10 group-hover/seal:shadow-[0_0_50px_rgba(6,182,212,0.2)]'} ${theme === 'light' ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-white/[0.02]'}`}>
                                    {/* Rotating Seal Rings */}
                                    <motion.div 
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                      className="absolute inset-1.5 border border-dashed border-cyan-500/20 rounded-full"
                                    />
                                    <motion.div 
                                      animate={{ rotate: -360 }}
                                      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                      className="absolute inset-3 border border-dotted border-cyan-500/10 rounded-full"
                                    />
 
                                    {viewState === 'opening' || isScanning ? (
                                       <Scan className="w-7 h-7 animate-pulse text-cyan-400" />
                                    ) : (
                                       <Fingerprint className={`w-8 h-8 transition-all duration-700 ${isTimeLocked ? 'opacity-20' : 'opacity-40 group-hover/seal:opacity-100 group-hover/seal:text-cyan-400 group-hover/seal:scale-110'}`} />
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`text-[8px] font-mono font-black uppercase tracking-[0.8em] transition-all ${isTimeLocked ? 'opacity-10' : 'opacity-40 group-hover/seal:opacity-100 group-hover/seal:text-cyan-400'}`}>
                                    {isTimeLocked ? t.locked : (t.unlock || "UNLOCK")}
                                  </span>
                                  <span className="text-[6px] font-mono opacity-20 uppercase tracking-widest">{t.version} {APP_VERSION}</span>
                                </div>
                            </motion.button>
                         </div>
                    </div>
                 </motion.div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>


      {/* 
         === STATE 2: READING CONTENT (The "Letter" Unfolded) === 
         【核心安全点 3：物理隔离渲染】
         敏感内容容器仅在 viewState === 'reading' 时存在于 DOM 中。
         这从根本上杜绝了通过 CSS (如 display: block) 绕过验证的可能性。
      */}
      <AnimatePresence>
        {viewState === 'reading' && (
          <motion.div 
            initial={{ 
              opacity: 0, 
              y: 40, 
              scale: 0.8, 
              skewX: -20, 
              skewY: 10, 
              filter: 'blur(30px) brightness(2)' 
            }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              skewX: 0, 
              skewY: 0, 
              filter: 'blur(0px) brightness(1)' 
            }}
            exit={{ 
              opacity: 0, 
              y: -40, 
              scale: 1.1, 
              skewX: 20, 
              filter: 'blur(20px)' 
            }}
            transition={{ 
              duration: 1.2, 
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.8 }
            }}
            className={`container mx-auto px-4 py-4 md:py-6 max-w-3xl min-h-screen ${getContainerStyles()}`}
          >
            {burnMode === 'idle' && archiveState === 'idle' && (
              <div className="mb-8 flex justify-between items-center z-20 relative">
                <CyberButton variant="ghost" onClick={onBack} theme={theme} className={theme === 'light' ? 'text-[#718096] hover:bg-[rgba(0,122,140,0.05)]' : ''}>
                  <ArrowLeft className="w-4 h-4" /> {t.closeFile}
                </CyberButton>

                <div className="flex items-center gap-4">
                        <AnimatePresence>
                          {showConfirmHome && (
                            <motion.span 
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(99,102,241,0.3)]"
                            >
                              {t.confirmAction || "Confirm?"}
                            </motion.span>
                          )}
                        </AnimatePresence>

                </div>
              </div>
            )}

            <div className={`border p-6 md:p-12 relative overflow-hidden min-h-[500px] transition-all duration-1000 shadow-lg z-10 backdrop-blur-md
              ${theme === 'light' ? 'bg-white/95 border-[rgba(0,122,140,0.1)] shadow-slate-200/50' : 'bg-[#030303]/90 border-cyan-500/20'}
              ${burnMode === 'confirm' ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 
                burnMode !== 'idle' ? 'border-rose-500 bg-rose-950/20' : 
                archiveState !== 'idle' ? 'border-green-500 bg-green-900/10' : ''}
            `}>
                     <div className={`absolute top-0 right-0 w-32 h-32 pointer-events-none z-30 overflow-hidden`}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            transition={{ duration: 8, repeat: Infinity, delay: i * 2.5, ease: "linear" }}
                            className={`absolute top-0 right-0 w-24 h-24 border rounded-full -translate-y-1/2 translate-x-1/2 
                              ${i === 1 && theme === 'dark' ? 'border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 
                                theme === 'light' ? 'border-cyan-500/30' : 'border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]'}`}
                          />
                        ))}
                
                {/* Background Twinkling Stars */}
                <div className="absolute inset-y-0 right-0 w-full z-5">
                  {decodedStars.map((star, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
                      className="absolute w-0.5 h-0.5 bg-white rounded-full bg-slate-100"
                      style={{ top: star.top, right: star.right }}
                    />
                  ))}
                </div>

                <div className={`absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-40`} />
                <div className={`absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 blur-2xl rounded-full -translate-y-1/3 translate-x-1/3 opacity-30 shadow-[0_0_30px_rgba(99,102,241,0.1)]`} />
              </div>
              
              {/* Decorative Letter Header removed for simplicity */}

              <div className={`pb-4 mb-6 relative z-10`}>
                <div className={`flex items-center gap-3 mb-8 px-2 border-l-2 ${theme === 'light' ? 'border-slate-300' : 'border-cyan-800'}`}>
                    <span className={`text-[8px] font-mono tracking-[0.4em] uppercase opacity-40 ${theme === 'light' ? 'text-slate-500' : 'text-cyan-600'}`}>{t.transmissionDecoded}</span>
                </div>

                <h1 className={`text-2xl md:text-4xl font-bold mb-1 tracking-wide uppercase leading-tight font-mono ${theme === 'light' ? 'text-[#1a202c]' : 'text-white'}`}>
                  {decrypted ? (
                     <DecryptionText text={entry.title} speed={50} />
                  ) : (
                     <span className={`${theme === 'light' ? 'text-[#718096]/20' : 'text-gray-600'} blur-sm select-none`}>{t.encryptedTitle}</span>
                  )}
                </h1>
                
                <div className={`flex flex-wrap gap-4 text-[10px] font-mono mt-2 items-center uppercase tracking-wider ${theme === 'light' ? 'text-[#718096]' : 'text-cyan-500/60'}`}>
                    <span className="flex items-center gap-1"><Key className="w-3 h-3" /> {new Date(entry.createdAt).toLocaleString('zh-CN')}</span>
                    <span className={decrypted ? 'text-green-500 font-bold' : 'text-yellow-500 font-bold'}>
                       {decrypted ? (entry.isArchived ? t.statusArchived : t.statusUnlocked) : t.statusDecrypting}
                    </span>
                </div>

                {/* Tags Display */}
                {entry.tags && entry.tags.length > 0 && decrypted && (
                    <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-left-2 duration-700">
                        {entry.tags.map(tag => (
                            <span key={tag} className={`text-[9px] uppercase px-2 py-0.5 border rounded-sm ${theme === 'light' ? 'border-[rgba(0,122,140,0.1)] text-[#718096] bg-[rgba(0,122,140,0.02)]' : 'border-cyan-900 text-cyan-600 bg-cyan-950/10'}`}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
              </div>

              {/* Content Area */}
              <div className="relative z-10">
                {decrypted ? (
                  <div className="space-y-6">
                    {/* Removed specific loading text block */}

                    <div className={`prose max-w-none ${theme === 'light' ? 'prose-slate' : 'prose-invert'}`}>
                      <div className={`leading-relaxed font-serif text-lg md:text-xl whitespace-pre-wrap selection:bg-cyan-500/30 ${theme === 'light' ? 'text-[#1a202c]' : 'text-cyan-100/90'}`}>
                        <Markdown components={MarkdownComponents(theme)}>{decryptedContent}</Markdown>
                      </div>
                    </div>
                    
                    {/* Media Attachment */}
                    {entry.attachment && (
                      <ViewerAttachmentPanel attachment={entry.attachment} theme={theme} />
                    )}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20 select-none">
                     <span className={`${theme === 'light' ? 'text-[#718096]/20' : 'text-gray-600'} blur-sm select-none text-4xl break-all line-clamp-3`}>
                       {entry.content}
                     </span>
                  </div>
                )}
              </div>

                    <MorningStarPanel
                      theme={theme}
                      t={t}
                      entry={entry}
                      guidingStars={guidingStars}
                      readingStep={readingStep}
                      setReadingStep={setReadingStep}
                      reflectionText={reflectionText}
                      setReflectionText={setReflectionText}
                      morningStarPersonas={morningStarPersonas}
                      setMorningStarPersonas={setMorningStarPersonas}
                      morningStarLoading={morningStarLoading}
                      morningStarError={morningStarError}
                      parsedAnalysis={parsedAnalysis}
                      onAnalyze={handleMorningStarAnalysis}
                      onDeleteAnalysis={handleDeleteAnalysis}
                      markdownComponents={MarkdownComponents(theme)}
                    />

              {/* Action Footer */}
              {decrypted && burnMode === 'idle' && archiveState === 'idle' && (readingStep === 'reading' || readingStep === 'evaluation') && (
                <ViewerActionFooter
                  theme={theme}
                  t={t}
                  entry={entry}
                  containers={containers}
                  showPackingMenu={showPackingMenu}
                  onTogglePackingMenu={() => setShowPackingMenu(!showPackingMenu)}
                  onMoveToContainer={handleMoveToContainer}
                  onArchiveOrRestore={executeArchiveOrRestore}
                  onDownload={handleDownload}
                  onRequestBurn={() => setBurnMode('confirm')}
                />
              )}

              {/* Burn Confirmation Overlay */}
              <AnimatePresence>
                {burnMode === 'confirm' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-6 ${theme === 'light' ? 'bg-white/95' : 'bg-black/90'}`}
                  >
                    <div className="text-center space-y-6 max-w-sm">
                      <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className={`text-xl font-bold uppercase tracking-tighter ${theme === 'light' ? 'text-[#1a202c]' : 'text-white'}`}>{t.confirmDestruction}</h3>
                        <p className={`text-xs font-mono text-rose-500/60`}>{t.permDelete}</p>
                      </div>
                      <div className="flex gap-4">
                        <CyberButton className="flex-1" variant="ghost" onClick={() => setBurnMode('idle')} theme={theme}>{t.cancel}</CyberButton>
                        <CyberButton className="flex-1" variant="danger" onClick={executeBurn} theme={theme}>{t.confirm}</CyberButton>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Decorative Background Elements */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-5 bg-cyan-500/5"></div>
            </div>

            {/* Footer Metadata */}
            <div className={`mt-8 flex justify-between items-center text-[8px] font-mono uppercase tracking-[0.3em] ${theme === 'light' ? 'text-[#718096]/40' : 'text-cyan-900'}`}>
                <span>VECTOR_TRACE_PROTOCOL_V2.8</span>
                <span>NODE_ID: {entry.id}</span>
                <span>ENCRYPTION: AES-256-GCM</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Keyframes (Simplified) */}
      <style>{`
        /* scan-down removed for performance */
      `}</style>
    </div>
  );
};
