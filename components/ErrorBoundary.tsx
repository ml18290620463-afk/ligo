import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { CyberButton } from './CyberButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020508] flex items-center justify-center p-6 font-mono">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md border border-rose-500/30 bg-rose-950/5 p-8 rounded-2xl relative overflow-hidden shadow-2xl"
          >
            {/* Background Glitch Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-950/20 text-rose-500 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <AlertCircle size={40} />
              </div>
              
              <h2 className="text-2xl font-black tracking-tighter text-rose-100 uppercase italic">
                System Core Failure // 系统核心崩溃
              </h2>
              
              <div className="p-4 bg-black/60 rounded border border-rose-900/30 text-left">
                <div className="text-[10px] text-rose-500/50 uppercase mb-1">Error Trace:</div>
                <div className="text-xs text-rose-400 font-mono break-all leading-relaxed opacity-80">
                  {this.state.error?.message || 'CRITICAL_KERNEL_ERROR_0xDEADBEEF'}
                </div>
              </div>

              <p className="text-xs text-rose-800 tracking-widest uppercase font-black opacity-60">
                Temporal Anchor Disconnected // 时空锚点已断开
              </p>

              <div className="pt-4">
                <CyberButton 
                  onClick={this.handleReset}
                  variant="primary"
                  className="w-full !bg-rose-500/20 !border-rose-500/50 !text-rose-400 hover:!bg-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <RotateCcw size={16} />
                    <span>Reboot Sequence // 重新载入</span>
                  </div>
                </CyberButton>
              </div>
            </div>

            {/* Corner Accents */}
            <span className="absolute top-0 left-0 w-4 h-4 border-l border-t border-rose-500/30" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-rose-500/30" />
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
