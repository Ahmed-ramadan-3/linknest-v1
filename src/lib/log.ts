declare const __DEV__: boolean | undefined;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/** Developer-only diagnostics. Nothing is logged in production builds. */
export function logDev(message: string, detail?: unknown): void {
  if (!isDev) return;
  console.warn(`[LinkNest] ${message}`, detail);
}
