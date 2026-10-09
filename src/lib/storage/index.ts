export interface BrowserStorageInfo {
  /** Bytes used by this origin, as estimated by the browser. Approximate. */
  usage: number | null;
  /** Bytes the browser is willing to give this origin. Approximate. */
  quota: number | null;
  /** Whether the browser promised not to evict this data under storage pressure. */
  persisted: boolean | null;
}

/** The estimate APIs are optional and deliberately fuzzy, so every field may be null. */
export async function getBrowserStorageInfo(): Promise<BrowserStorageInfo> {
  const info: BrowserStorageInfo = { usage: null, quota: null, persisted: null };
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage) return info;
  try {
    if (typeof storage.estimate === 'function') {
      const estimate = await storage.estimate();
      info.usage = typeof estimate.usage === 'number' ? estimate.usage : null;
      info.quota = typeof estimate.quota === 'number' ? estimate.quota : null;
    }
    if (typeof storage.persisted === 'function') info.persisted = await storage.persisted();
  } catch {
    // Leave the unknown fields as null.
  }
  return info;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return typeof navigator.storage?.persist === 'function' ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}

/** Size of the user's data when serialised, a reliable lower bound of what is stored. */
export function approximateDataBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
