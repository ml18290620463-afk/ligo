import React from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Maximize, Minimize } from 'lucide-react';
import { Theme } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { RecoveryFlowState } from '../hooks/useRecoveryFlow';

interface MasterLockRecoveryFormProps {
  theme: Theme;
  t: TranslationDictionary;
  /** Full state surface from `useRecoveryFlow`. */
  recovery: RecoveryFlowState;
}

/**
 * "Forgot password → recovery key → new password" form lifted out of
 * MasterLock.tsx as part of Phase 2 §2.i (follow-up to the
 * useRecoveryFlow / useLockoutTimer / MasterLockBackdrop split).
 *
 * Pure presentation: renders the three input fields (recovery key,
 * new password, confirm), the optional error banner with role="alert",
 * and the submit button. All state lives in the parent through the
 * `recovery` prop; this component never owns useState.
 *
 * The error banner uses role="alert" so screen readers announce
 * validation failures synchronously, and the recovery key + password
 * toggle buttons carry type="button" so they don't accidentally submit
 * the surrounding form.
 */
export const MasterLockRecoveryForm: React.FC<MasterLockRecoveryFormProps> = ({
  theme,
  t,
  recovery,
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="w-full space-y-4"
  >
    <div className="space-y-2">
      <h2
        className={`text-xl font-mono font-bold tracking-widest uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}
      >
        {t.resetPassword}
      </h2>
      <p
        className={`text-[10px] font-mono tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-cyan-600'}`}
      >
        {t.inputRecoveryKey}
      </p>
    </div>

    <div className="space-y-4">
      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] font-mono text-cyan-500 font-bold uppercase tracking-wider">
          {t.recoveryKeyTitle}
        </label>
        <div className="relative group">
          <input
            type={recovery.showKey ? 'text' : 'password'}
            value={recovery.recoveryInput}
            onChange={(e) => recovery.setRecoveryInput(e.target.value)}
            className={`w-full border p-3 font-mono text-sm focus:outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-400' : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-100 focus:border-cyan-500/50'}`}
            placeholder="XXXX-XXXX-XXXX-XXXX..."
            aria-label={t.recoveryKeyTitle}
          />
          <button
            type="button"
            onClick={recovery.toggleShowKey}
            aria-label={recovery.showKey ? 'Hide recovery key' : 'Show recovery key'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-700 hover:text-cyan-400"
          >
            {recovery.showKey ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] font-mono text-cyan-500 font-bold uppercase tracking-wider">
          {t.newPassword}
        </label>
        <div className="relative group">
          <input
            type={recovery.showNewPassword ? 'text' : 'password'}
            value={recovery.newPassword}
            onChange={(e) => recovery.setNewPassword(e.target.value)}
            className={`w-full border p-3 font-mono text-sm focus:outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-400' : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-100 focus:border-cyan-500/50'}`}
            placeholder="••••••••"
            aria-label={t.newPassword}
          />
          <button
            type="button"
            onClick={recovery.toggleShowNewPassword}
            aria-label={
              recovery.showNewPassword ? t.hidePassword || 'Hide password' : t.showPassword || 'Show password'
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-700 hover:text-cyan-400"
          >
            {recovery.showNewPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] font-mono text-cyan-500 font-bold uppercase tracking-wider">
          {t.confirmPassword}
        </label>
        <div className="relative group">
          <input
            type={recovery.showNewPassword ? 'text' : 'password'}
            value={recovery.confirmNewPassword}
            onChange={(e) => recovery.setConfirmNewPassword(e.target.value)}
            className={`w-full border p-3 font-mono text-sm focus:outline-none transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-400' : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-100 focus:border-cyan-500/50'}`}
            placeholder="••••••••"
            aria-label={t.confirmPassword}
          />
          <button
            type="button"
            onClick={recovery.toggleShowNewPassword}
            aria-label={
              recovery.showNewPassword ? t.hidePassword || 'Hide password' : t.showPassword || 'Show password'
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-700 hover:text-cyan-400"
          >
            {recovery.showNewPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>

    {recovery.resetError && (
      <div role="alert" className="p-3 bg-[#C85F72]/5 border border-[#C85F72]/20 rounded">
        <p className="text-[10px] font-mono text-[#C85F72] uppercase tracking-tight neon-glow-alert">
          {recovery.resetError}
        </p>
      </div>
    )}

    <button
      type="button"
      onClick={recovery.submitRecovery}
      className={`w-full py-4 font-mono text-xs tracking-widest transition-all ${theme === 'light' ? 'bg-slate-900 text-white hover:bg-cyan-600' : 'bg-cyan-500 text-black hover:bg-cyan-400 font-bold'}`}
    >
      {t.confirmAction}
    </button>
  </motion.div>
);
