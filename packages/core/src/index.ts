/**
 * Ultra-lightweight i18n core – framework-agnostic, zero-cost hot path.
 *
 * Design goals:
 * - Framework-agnostic core
 * - No global mutable state
 * - No class, no proxy, no reflection
 * - Pure function hot-path
 * - Single fetch per locale (instance-scoped cache)
 * - O(1) key lookup
 * - Zero allocation per translation call
 * - SSR & concurrency safe by default
 */

export interface LokatOptions {
  /**
   * Resolve the URL for a given locale. Example: (locale) => `/locales/${locale}.json`
   */
  resolveLocaleUrl: (locale: string) => string

  /**
   * Optional fetcher. Defaults to `globalThis.fetch` when available.
   * Must return a Response-like object with a `.json()` method.
   */
  fetcher?: (input: string) => Promise<{ json(): unknown }>
}

export interface LokatInstance {
  /**
   * Load and cache the flat dictionary for a locale.
   * Ensures single-flight per locale (per instance).
   */
  load(locale: string): Promise<Record<string, string>>

  /**
   * Create a translator function bound to the provided dictionary.
   * The returned function performs a single O(1) lookup with zero allocations.
   */
  createT(dict: Record<string, string>): (key: string) => string
}

export function createLokat(options: LokatOptions): LokatInstance {
  const { resolveLocaleUrl } = options
  // Prefer provided fetcher; fallback to globalThis.fetch if available.
  const fetcher =
    options.fetcher ?? (globalThis.fetch as (input: string) => Promise<{ json(): unknown }>)

  // Instance-scoped cache: locale -> Promise<dict>
  const cache = new Map<string, Promise<Record<string, string>>>()

  function load(locale: string): Promise<Record<string, string>> {
    let promise = cache.get(locale)
    if (!promise) {
      const url = resolveLocaleUrl(locale)
      // Defer to provided fetcher; no runtime validation for minimal overhead.
      promise = fetcher(url).then((r) => r.json() as Promise<Record<string, string>>)
      cache.set(locale, promise)
    }
    return promise
  }

  function createT(dict: Record<string, string>) {
    return (key: string): string => dict[key] ?? key
  }

  return { load, createT }
}

export type { LokatOptions as CreateLokatOptions }
