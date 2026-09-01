/**
 * GitHub Actions log output. Structured but readable: it is scanned by eye in
 * the runner log after a job, and it uses the same shape as the entries written
 * to ingest_runs.errors.
 */
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const line = [new Date().toISOString(), level.toUpperCase().padEnd(5), message].join(' ');
  const suffix = context ? ' ' + JSON.stringify(context) : '';

  if (level === 'error') console.error(line + suffix);
  else if (level === 'warn') console.warn(line + suffix);
  else console.log(line + suffix);
}

export const log = {
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};

/** The shape written into ingest_runs.errors. */
export function toErrorEntry(stage: string, error: unknown, context?: Record<string, unknown>) {
  return {
    stage,
    message: error instanceof Error ? error.message : String(error),
    at: new Date().toISOString(),
    ...context,
  };
}
