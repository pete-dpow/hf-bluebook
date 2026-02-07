interface CachedContext {
  key: string;
  data: any;
  timestamp: number;
  expiresIn: number;
}

const contextCache = new Map<string, CachedContext>();
const DEFAULT_TTL = 1000 * 60 * 15;

export function getCachedContext<T>(key: string): T | null {
  const cached = contextCache.get(key);

  if (!cached) {
    return null;
  }

  const now = Date.now();
  const age = now - cached.timestamp;

  if (age > cached.expiresIn) {
    contextCache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCachedContext<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  const context: CachedContext = {
    key,
    data,
    timestamp: Date.now(),
    expiresIn: ttl,
  };

  contextCache.set(key, context);
}

export function invalidateCache(key: string): void {
  contextCache.delete(key);
}

export function invalidateAllCache(): void {
  contextCache.clear();
}

export function getCacheStats(): {
  totalEntries: number;
  keys: string[];
  sizes: Record<string, number>;
} {
  const keys = Array.from(contextCache.keys());
  const sizes: Record<string, number> = {};

  keys.forEach((key) => {
    const cached = contextCache.get(key);
    if (cached) {
      const jsonStr = JSON.stringify(cached.data);
      sizes[key] = jsonStr.length;
    }
  });

  return {
    totalEntries: contextCache.size,
    keys,
    sizes,
  };
}

export interface ProjectManifest {
  sourceDirectories: string[];
  excludedPatterns: string[];
  apiRoutes: string[];
  componentPaths: string[];
  utilityPaths: string[];
  lastScanned: number;
}

const PROJECT_MANIFEST: ProjectManifest = {
  sourceDirectories: ['app', 'components', 'lib', 'hooks'],
  excludedPatterns: [
    'node_modules',
    '.next',
    'out',
    'build',
    'dist',
    'coverage',
    'package-lock.json',
    '*.tsbuildinfo',
  ],
  apiRoutes: ['app/api'],
  componentPaths: ['components', 'app'],
  utilityPaths: ['lib', 'hooks'],
  lastScanned: Date.now(),
};

export function getProjectManifest(): ProjectManifest {
  return PROJECT_MANIFEST;
}

export function updateProjectManifest(updates: Partial<ProjectManifest>): void {
  Object.assign(PROJECT_MANIFEST, updates);
  PROJECT_MANIFEST.lastScanned = Date.now();
}

export function shouldScanDirectory(dirPath: string): boolean {
  const manifest = getProjectManifest();

  for (const pattern of manifest.excludedPatterns) {
    if (dirPath.includes(pattern)) {
      return false;
    }
  }

  return true;
}

export function getScannableDirectories(): string[] {
  return getProjectManifest().sourceDirectories;
}

export function cacheProjectStructure(structure: any): void {
  setCachedContext('project_structure', structure, 1000 * 60 * 30);
}

export function getCachedProjectStructure(): any | null {
  return getCachedContext('project_structure');
}

export function cacheFileContent(filePath: string, content: string): void {
  setCachedContext(`file:${filePath}`, content, 1000 * 60 * 10);
}

export function getCachedFileContent(filePath: string): string | null {
  return getCachedContext(`file:${filePath}`);
}

export function invalidateFileCache(filePath: string): void {
  invalidateCache(`file:${filePath}`);
}
