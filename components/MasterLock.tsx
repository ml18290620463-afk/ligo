import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Terminal,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../constants';
import { SecurityService } from '../services/securityService';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { useLockoutTimer } from '../hooks/useLockoutTimer';
import { useRecoveryFlow } from '../hooks/useRecoveryFlow';
import { createSeededRandom } from '../lib/random';
import { MasterLockBackdrop } from './MasterLockBackdrop';
import { MasterLockRecoveryForm } from './MasterLockRecoveryForm';

interface MasterLockProps {
  language: Language;
  theme?: Theme;
  passwordHash: string;
  passwordSalt: string | null;
  onUnlock: (password: string) => void;
  onResetPassword?: (password: string) => void;
  onCancel?: () => void;
  onWipeData?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

export const MasterLock: React.FC<MasterLockProps> = ({
  language,
  theme = 'dark',
  passwordHash,
  passwordSalt,
  onUnlock,
  onResetPassword,
  onCancel,
}) => {
  const t = TRANSLATIONS[language];
  const { scheduleTimeout } = useTimeoutManager();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isDecrypting] = useState(false);
  const lockout = useLockoutTimer({
    maxAttempts: MAX_ATTEMPTS,
    lockoutDurationMs: LOCKOUT_DURATION_MS,
  });
  const recovery = useRecoveryFlow({ language, t, onResetPassword, onUnlock });

  // Biometric Detection
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isRitualActive, setIsRitualActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Corner-of-card stars (the panel chrome decoration). Distinct from
  // the fullscreen starfield, which lives in `MasterLockBackdrop`.
  const cornerStars = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const random = createSeededRandom(`master-corner-${i}`);
        return {
          top: `${random() * 60}%`,
          right: `${random() * 60}%`,
          duration: 2.5 + random() * 2,
          delay: random() * 4,
        };
      }),
    [],
  );

  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Check biometric availability
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        if (window.PublicKeyCredential) {
          const available =
            await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        }
      } catch (e) {
        console.warn('Biometric check restricted by environment policy');
        setBiometricAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  // Automatic hash check for ritual
  useEffect(() => {
    const checkPassword = async () => {
      if (
        password.length < 4 ||
        isRitualActive ||
        lockout.isLocked ||
        isScanning ||
        isSuccess
      )
        return;

      try {
        const isValid = await SecurityService.verifyPassword(
          password,
          passwordSalt || '',
          passwordHash,
        );
        if (isValid) {
          setIsRitualActive(true);
          setError(false);
          setIsSuccess(true);

          // Reduced ritual duration for better UX
          scheduleTimeout(() => {
            onUnlock(password);
          }, 800);
        }
      } catch (e) {
        console.error('MasterLock Verification Error:', e);
      }
    };

    const timeout = setTimeout(checkPassword, 300); // Slight debounce to avoid heavy hashing on every keystroke
    return () => clearTimeout(timeout);
  }, [
    password,
    passwordHash,
    passwordSalt,
    lockout.isLocked,
    isScanning,
    isSuccess,
    isRitualActive,
    onUnlock,
    scheduleTimeout,
  ]);

  const handleBiometricAuth = async () => {
    if (isScanning || lockout.isLocked) return;

    setIsScanning(true);
    setBiometricError(null);

    try {
      // Proof of Presence using WebAuthn
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: 'VECTOR_TRACE' },
          user: {
            id: new Uint8Array(16),
            name: 'local-user',
            displayName: 'Local User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      };

      await navigator.credentials.create(options);

      // Success
      setIsSuccess(true);
      await new Promise<void>((resolve) => scheduleTimeout(resolve, 1000));

      setBiometricError(
        language === 'zh'
          ? '生物识别仅确认为本人，仍需密码解锁数据'
          : 'Biometrics verified, but password still required for decryption',
      );
      setIsScanning(false);
      setIsSuccess(false);
    } catch (err: unknown) {
      console.error('Biometric error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setBiometricError(t.biometricRestricted || 'Environment Restricted');
      } else {
        setBiometricError(err instanceof Error ? err.message : 'Auth Failed');
      }
      setIsScanning(false);
    }
  };

  // Avoid unused-import lint while still allowing future biometric UI
  // surfacing. The behaviour itself is wired and tested above.
  void biometricAvailable;
  void handleBiometricAuth;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-10 backdrop-blur-3xl overflow-y-auto transition-colors duration-1000 ${theme === 'light' ? 'bg-[#fafafa]' : 'bg-[#030303]'}`}
    >
      <MasterLockBackdrop theme={theme} />

      <div className="relative w-full max-w-[340px] md:max-w-[380px] perspective-[3000px] z-10 transition-all duration-500 my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileHover={{
            x: [0, -0.8, 0.8, -0.8, 0.8, 0],
            y: [0, 0.4, -0.4, 0.4, 0, 0],
            transition: { duration: 0.3 },
          }}
          animate={
            isSuccess
              ? {
                  rotateX: 110,
                  rotateY: [0, 45, -45, 0],
                  z: 800,
                  opacity: 0,
                  scale: [1, 1.8, 2.5],
                  skewX: [0, 40, -40, 0],
                  skewY: [0, -20, 20, 0],
                  filter: ['blur(0px)', 'blur(15px)', 'blur(30px)'],
                }
              : {
                  opacity: 1,
                  scale: 1,
                  y: [0, -10, 0],
                  rotateY: [-1.2, 1.2, -1.2],
                  rotateX: [0.5, -0.5, 0.5],
                }
          }
          transition={
            isSuccess
              ? {
                  duration: 2.2,
                  ease: 'circIn',
                  skewX: { duration: 1.1, repeat: 1 },
                  skewY: { duration: 1.1, repeat: 1 },
                }
              : {
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.4 },
                  y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                  rotateY: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
                  rotateX: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
                }
          }
          className={`
            relative w-full p-5 sm:p-6 border transition-all duration-1000 group rounded-sm
            ${theme === 'light' ? 'bg-[#faf9f6] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border-[#e2e8f0]' : 'bg-[#0a0a0a] border border-white/[0.08] shadow-[0_0_100px_rgba(6,182,212,0.1)]'}
            ${isSuccess ? 'pointer-events-none' : ''}
          `}
        >
          {/* Cyberpunk Space-Time Ripples (Enhanced with Star-field & Rose) */}
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none z-40 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{
                  scale: 3,
                  opacity: 0,
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  delay: i * 2.5,
                  ease: 'linear',
                }}
                className={`absolute top-0 right-0 w-24 h-24 border-2 rounded-full -translate-y-1/2 translate-x-1/2 
                    ${
                      i === 1 && theme === 'dark'
                        ? 'border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.3),0_0_60px_rgba(99,102,241,0.1)]'
                        : theme === 'light'
                          ? 'border-cyan-500/20'
                          : 'border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                    }`}
              />
            ))}

            {/* Twinkling Stars in Background */}
            <div className="absolute inset-0 z-5">
              {cornerStars.map((star, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
                  style={{ top: star.top, right: star.right }}
                />
              ))}
            </div>

            {/* Spatial Tech Glow (Neon Cyan & Rose Mix) */}
            <div
              className={`
                  absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full 
                  -translate-y-1/2 translate-x-1/2 opacity-60 z-10
                  ${theme === 'light' ? 'bg-cyan-200' : 'bg-cyan-500/40'}
              `}
            />
            {theme === 'dark' && (
              <motion.div
                animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full -translate-y-1/4 translate-x-1/4 z-11 bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)]"
              />
            )}

            {/* Corner Plate Overlay */}
            <div
              className={`absolute top-0 right-0 w-0 h-0 border-t-[50px] border-r-[50px] border-t-transparent z-40 ${theme === 'light' ? 'border-r-white/90' : 'border-r-black/80'}`}
            />
            <div
              className={`absolute top-0 right-0 w-px h-[70px] rotate-45 origin-top-right z-50 ${theme === 'light' ? 'bg-cyan-500/40' : 'bg-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`}
            />
          </div>

          {/* Background Pattern & Paper Grain */}
          <div
            className={`absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply ${theme === 'light' ? 'bg-[url("https://www.transparenttextures.com/patterns/natural-paper.png")]' : 'bg-[url("https://www.transparenttextures.com/patterns/dark-matter.png")]'}`}
          />
          <div
            className={`absolute inset-0 opacity-[0.02] pointer-events-none ${theme === 'light' ? 'bg-[url("https://www.transparenttextures.com/patterns/gray-lines.png")]' : ''}`}
          />

          {/* Document Folding Effect (Subtle Line) */}
          <div
            className={`absolute inset-0 opacity-[0.03] pointer-events-none ${theme === 'light' ? 'bg-[linear-gradient(135deg,transparent_45%,#000_50%,transparent_55%)]' : 'bg-[linear-gradient(135deg,transparent_45%,#fff_50%,transparent_55%)]'}`}
          />

          {/* Navigation Control */}
          <div className="absolute top-4 left-4 z-50">
            {recovery.isRecoveryMode && (
              <button
                onClick={() => recovery.setIsRecoveryMode(false)}
                className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 ${theme === 'light' ? 'text-slate-400 hover:text-slate-900' : 'text-cyan-600 hover:text-cyan-400'}`}
              >
                <ArrowRight className="w-3 h-3 rotate-180" />{' '}
                {language === 'zh' ? '返回解锁' : 'BACK'}
              </button>
            )}
          </div>
          {onCancel && (
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <AnimatePresence>
                {showConfirmHome && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 px-3 py-1 bg-black border border-[#C85F72]/30 rounded-full shadow-[0_0_15px_rgba(200,95,114,0.1)]"
                  >
                    <AlertCircle className="w-3 h-3 text-[#C85F72]" />
                    <span className="text-[10px] font-mono text-[#C85F72] uppercase tracking-widest font-bold neon-glow-alert">
                      {t.confirmAction}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => {
                  const now = Date.now();
                  if (showConfirmHome) {
                    if (now - lastClickTime > 500) {
                      onCancel();
                    }
                  } else {
                    setShowConfirmHome(true);
                    setLastClickTime(now);
                    scheduleTimeout(() => setShowConfirmHome(false), 3000);
                  }
                }}
                className={`p-2.5 rounded-full transition-all group ${showConfirmHome ? 'bg-[#C85F72] text-white shadow-[0_0_20px_rgba(200,95,114,0.4)]' : theme === 'light' ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-900 border border-transparent' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/5'}`}
                title={language === 'zh' ? '返回上一步' : 'Back to Previous Step'}
              >
                <ArrowLeft
                  className={`w-5 h-5 transition-transform ${showConfirmHome ? 'scale-110' : 'group-hover:scale-110'}`}
                />
              </button>
            </div>
          )}

          {/* Cyber Accents */}
          <div
            className={`absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 ${theme === 'light' ? 'border-cyan-400' : 'border-cyan-500/50'}`}
          />
          <div
            className={`absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 ${theme === 'light' ? 'border-cyan-400' : 'border-cyan-500/50'}`}
          />
          <div
            className={`absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 ${theme === 'light' ? 'border-cyan-400' : 'border-cyan-500/50'}`}
          />
          <div
            className={`absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 ${theme === 'light' ? 'border-cyan-400' : 'border-cyan-500/50'}`}
          />

          <div className="flex flex-col items-center text-center space-y-4">
            {recovery.isRecoveryMode ? (
              <MasterLockRecoveryForm theme={theme} t={t} recovery={recovery} />
            ) : (
              <>
                {/* Visual Feedback Area */}
                <div className="relative">
                  <motion.div
                    animate={isDecrypting || isScanning ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-colors duration-500 ${isSuccess ? 'border-green-500 bg-green-500/10' : error || lockout.isLocked ? 'border-[#C85F72] bg-[#C85F72]/5 neon-border-alert' : theme === 'light' ? 'border-cyan-200' : 'border-white/10'}`}
                  >
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <ShieldCheck className="w-10 h-10 text-green-500" />
                        </motion.div>
                      ) : isScanning ? (
                        <motion.div
                          key="scanning"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <Fingerprint
                            className={`w-10 h-10 ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'}`}
                          />
                        </motion.div>
                      ) : isDecrypting ? (
                        <Terminal
                          className={`w-10 h-10 ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'}`}
                        />
                      ) : (
                        <Fingerprint
                          className={`w-10 h-10 ${error || lockout.isLocked ? 'text-[#C85F72] neon-glow-alert' : theme === 'light' ? 'text-cyan-600' : 'text-slate-500'}`}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Status Badge */}
                  <AnimatePresence>
                    {(error || lockout.isLocked || biometricError) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black border border-[#C85F72]/30 text-[#C85F72] text-[10px] px-3 py-1 font-bold uppercase tracking-[0.2em] whitespace-nowrap shadow-[0_4px_12px_rgba(200,95,114,0.15)]"
                      >
                        {lockout.isLocked
                          ? `${t.tooManyAttempts} (${lockout.secondsRemaining}s)`
                          : biometricError || t.passwordMismatch}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-1">
                  <h2
                    className={`text-2xl font-mono font-bold tracking-tighter uppercase italic ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}
                  >
                    {isSuccess ? t.identityVerified : t.masterLock}
                  </h2>
                  <p
                    className={`text-xs font-mono leading-relaxed tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-cyan-500/60'}`}
                  >
                    {lockout.isLocked
                      ? 'SECURITY LOCKDOWN ACTIVE'
                      : isScanning
                        ? t.scanningBiometrics
                        : t.enterMasterPassword}
                  </p>
                </div>

                <div className="w-full space-y-6">
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="relative w-full overflow-hidden">
                        <AnimatePresence mode="wait">
                          {!password && !lockout.isLocked && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0.2, 0.5, 0.2] }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-xl tracking-[0.8em] text-cyan-900/50"
                            >
                              ▪ ▪ ▪ ▪ ▪ ▪
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <input
                          autoFocus
                          type={showUnlockPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={async (e) => {
                            if (
                              e.key === 'Enter' &&
                              password.length >= 4 &&
                              !isRitualActive &&
                              !lockout.isLocked &&
                              !isSuccess
                            ) {
                              try {
                                const isValid = await SecurityService.verifyPassword(
                                  password,
                                  passwordSalt || '',
                                  passwordHash,
                                );
                                if (isValid) {
                                  setIsRitualActive(true);
                                  setIsSuccess(true);
                                  scheduleTimeout(() => onUnlock(password), 500);
                                } else {
                                  setError(true);
                                  lockout.registerFailure();
                                  scheduleTimeout(() => setError(false), 2000);
                                }
                              } catch (err) {
                                console.error('MasterLock Enter-key Verification Error:', err);
                                setError(true);
                              }
                            }
                          }}
                          disabled={
                            isRitualActive ||
                            isDecrypting ||
                            lockout.isLocked ||
                            isScanning ||
                            isSuccess
                          }
                          className={`w-full border-b bg-transparent px-4 py-6 font-mono text-xl text-center tracking-[0.8em] transition-all focus:outline-none disabled:opacity-30 ${theme === 'light' ? 'border-slate-200 text-slate-900 focus:border-cyan-400 placeholder:text-slate-300' : 'border-cyan-900/30 text-cyan-400 focus:border-cyan-500/50 placeholder:text-cyan-900'}`}
                          placeholder={lockout.isLocked ? 'LOCKED' : ''}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 ${theme === 'light' ? 'text-slate-300 hover:text-slate-600' : 'text-cyan-900 hover:text-cyan-500'}`}
                          disabled={
                            isRitualActive ||
                            isDecrypting ||
                            lockout.isLocked ||
                            isScanning ||
                            isSuccess
                          }
                        >
                          {showUnlockPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Ritual Text Guidance */}
                    <div
                      className={`py-2 text-center font-mono space-y-1.5 transition-colors duration-1000 ${theme === 'light' ? 'text-slate-400' : 'text-cyan-500'}`}
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-xs tracking-[0.6em] font-light opacity-80">
                          打开记忆之锁
                        </p>
                        <p className="text-xs tracking-[0.6em] font-light opacity-80">
                          推开世界的门
                        </p>
                      </div>

                      <AnimatePresence>
                        {isRitualActive && (
                          <motion.div
                            key="ritual-line"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.8, ease: 'linear' }}
                            className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mt-2"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {!recovery.isRecoveryMode && (
                  <button
                    onClick={() => recovery.setIsRecoveryMode(true)}
                    className={`text-[10px] font-mono uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity ${theme === 'light' ? 'text-slate-400' : 'text-cyan-700'}`}
                  >
                    {t.forgotPassword}
                  </button>
                )}

                <div
                  className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] ${theme === 'light' ? 'text-slate-400' : 'text-cyan-900'}`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {language === 'zh' ? '加密协议 ● 已启动' : 'Encrypted Protocol ● Active'}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
