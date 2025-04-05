// メッセージ履歴の最適化
export const optimizeMessageHistory = <T>(messages: T[], maxLength: number = 50): T[] => {
  if (messages.length <= maxLength) {
    return messages;
  }
  return messages.slice(-maxLength);
};

// メモリ使用量の最適化
export const cleanupUnusedData = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data.map(item => cleanupUnusedData(item)) as unknown as T;
  }
  if (typeof data === 'object' && data !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = cleanupUnusedData(value);
      }
    }
    return cleaned as T;
  }
  return data;
};

// パフォーマンス計測
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await operation();
    const end = performance.now();
    console.log(`${label} took ${end - start}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`${label} failed after ${end - start}ms:`, error);
    throw error;
  }
};

// メモリ使用量の監視
export const monitorMemoryUsage = (label: string): void => {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    // TypeScriptの型定義に存在しないperformance.memoryをキャスト
    interface MemoryInfo {
      totalJSHeapSize: number;
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    }
    
    const memory = (performance as unknown as { memory: MemoryInfo }).memory;
    console.log(`${label} Memory Usage:`, {
      totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      jsHeapSizeLimit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
    });
  }
};

// バッチ処理の最適化
export const batchProcess = async <T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  return results;
};

// キャッシュの管理
export class Cache<T> {
  private cache: Map<string, { value: T; timestamp: number }>;
  private maxAge: number;

  constructor(maxAge: number = 5 * 60 * 1000) { // デフォルト5分
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

// デバウンス処理
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// スロットル処理
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}; 