export function logInfo(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...data }));
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ...data
    })
  );
}
