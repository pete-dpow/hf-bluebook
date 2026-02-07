const fetchCache = new Map<string, { timestamp: number; promise: Promise<any> }>();
let lastFetchUrl: string | null = null;

export async function fetchOnce(
  url: string,
  opts: RequestInit = {}
): Promise<Response | null> {
  if (lastFetchUrl === url) {
    return null;
  }

  lastFetchUrl = url;

  setTimeout(() => {
    lastFetchUrl = null;
  }, 3000);

  try {
    const res = await fetch(url, opts);
    return res;
  } catch (error) {
    throw error;
  }
}

export async function fetchWithCache(
  url: string,
  opts: RequestInit = {},
  cacheDuration = 5000
): Promise<Response | null> {
  const cacheKey = `${url}-${JSON.stringify(opts)}`;
  const cached = fetchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.promise;
  }

  const promise = fetch(url, opts);

  fetchCache.set(cacheKey, {
    timestamp: Date.now(),
    promise
  });

  setTimeout(() => {
    fetchCache.delete(cacheKey);
  }, cacheDuration);

  try {
    const res = await promise;
    return res;
  } catch (error) {
    fetchCache.delete(cacheKey);
    throw error;
  }
}

export function clearFetchCache() {
  fetchCache.clear();
  lastFetchUrl = null;
}
