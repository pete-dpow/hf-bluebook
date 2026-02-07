let lastCall = 0;

export async function safeCall<T>(
  fn: () => Promise<T>,
  cooldown = 4000
): Promise<T | null> {
  const now = Date.now();

  if (now - lastCall < cooldown) {
    return Promise.resolve(null);
  }

  lastCall = now;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    throw error;
  }
}

const callTimestamps = new Map<string, number>();

export async function safeCallKeyed<T>(
  key: string,
  fn: () => Promise<T>,
  cooldown = 4000
): Promise<T | null> {
  const now = Date.now();
  const lastCallTime = callTimestamps.get(key) || 0;

  if (now - lastCallTime < cooldown) {
    return Promise.resolve(null);
  }

  callTimestamps.set(key, now);

  try {
    const result = await fn();
    return result;
  } catch (error) {
    throw error;
  }
}

export function resetThrottle() {
  lastCall = 0;
  callTimestamps.clear();
}
