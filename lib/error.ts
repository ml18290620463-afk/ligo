export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
  }

  static fromError(err: unknown): AppError {
    if (err instanceof AppError) return err;
    const message = err instanceof Error ? err.message : '未知系统故障';
    return new AppError(ErrorCode.UNKNOWN_ERROR, message);
  }
}

/**
 * Log errors to console or external monitoring
 */
export const reportError = (error: Error | AppError, context?: string) => {
  console.error(`[${context || 'GLOBAL'}]`, error);
  // Implementation for Sentry or other tools could be added here
};
