const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'INFO';

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const correlationId = meta?.correlationId ?? '';
  const requestId = meta?.requestId ?? '';

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    requestId,
    message,
    ...(meta ? { ...meta } : {}),
  });
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('DEBUG')) console.debug(formatMessage('DEBUG', message, meta));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('INFO')) console.info(formatMessage('INFO', message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('WARN')) console.warn(formatMessage('WARN', message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog('ERROR')) console.error(formatMessage('ERROR', message, meta));
  },
};
