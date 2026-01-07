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

/**
 * Configuration options for the ultra-lightweight Lokat core.
 *
 * Notes
 * - Framework-agnostic: no assumptions about reactivity or runtime.
 * - SSR/Edge safe: instance-scoped, no global mutable state.
 * - Flat dictionary: keys are dot-notation strings, values are localized strings.
 *
 * Performance
 * - Single fetch per locale per instance.
 * - O(1) key lookup via direct property read.
 * - Zero allocation on the hot path (translation calls).
 */
export interface LokatOptions {
  /**
   * Resolve a URL (or any fetchable input) for a given locale.
   * @example
   * const opts: LokatOptions = {
   *   resolveLocaleUrl: (locale) => `/locales/${locale}.json`
   * }
   */
  resolveLocaleUrl: (locale: string) => string

  /**
   * Optional fetch function. Defaults to `globalThis.fetch` when available.
   * Must return a Response-like value exposing a `.json()` method.
   *
   * Provide a custom fetcher for environments without `fetch`, or to integrate
   * with bespoke loaders (e.g., precompiled dictionaries, file system reads in SSR).
   */
  fetcher?: (input: string) => Promise<{ json(): unknown }>
}

/**
 * A Lokat core instance API.
 */
export interface LokatInstance {
  /**
   * Load and cache the flat dictionary for `locale` within this instance.
   *
   * Behavior
   * - First call: performs one fetch + one JSON parse per locale.
   * - Subsequent calls: return the same resolved promise per locale (single-flight).
   * - Cache scope: per instance; no global caching.
   *
   * @param locale Locale identifier (string)
   * @returns A promise resolving to a flat dictionary of `{ key: value }`.
   */
  load(locale: string): Promise<Record<string, string>>

  /**
   * Create a translator function bound to the specified dictionary.
   *
   * Performance
   * - O(1) lookup: `dict[key]`.
   * - Zero allocation per call; returns the value or the key when missing.
   *
   * @param dict A flat dictionary mapping keys to localized strings.
   * @returns A translator function: `(key) => dict[key] ?? key`.
   */
  createT(dict: Record<string, string>): (key: string) => string
}

/**
 * Create a new Lokat core instance.
 *
 * Design
 * - Framework-agnostic: no classes, proxies, or hidden side-effects.
 * - SSR/Edge safe: instance-scoped cache, concurrency-friendly.
 * - Minimal scope: loading a locale dictionary and performing O(1) translations.
 *
 * @param options Lokat configuration (URL resolver, optional fetcher).
 * @returns A `LokatInstance` exposing `load(locale)` and `createT(dict)`.
 *
 * @example Basic usage (network loader)
 * ```ts
 * import { createLokat } from "@lokat/core"
 *
 * const lokat = createLokat({
 *   resolveLocaleUrl: (locale) => `/locales/${locale}.json`,
 * })
 *
 * const dict = await lokat.load("en")
 * const t = lokat.createT(dict)
 *
 * t("home.title") // => "Welcome" or key fallback
 * ```
 *
 * @example SSR/Edge safe per-request instance
 * ```ts
 * // inside a request handler
 * const lokat = createLokat({
 *   resolveLocaleUrl: (locale) => `https://cdn.example.com/i18n/${locale}.json`,
 * })
 * const dict = await lokat.load(req.locale)
 * const t = lokat.createT(dict)
 * const html = render({ title: t("home.title") })
 * ```
 *
 * @example Maximum performance: precompiled dictionary (no fetch)
 * ```ts
 * import { createLokat } from "@lokat/core"
 * import en from "./locales/en.gen.js" // flat object compiled at build-time
 *
 * const lokat = createLokat({
 *   resolveLocaleUrl: (l) => l, // unused
 *   // Custom fetcher returning a Response-like with .json()
 *   fetcher: async () => ({ json: async () => en })
 * })
 * const dict = await lokat.load("en") // returns precompiled object
 * const t = lokat.createT(dict)
 * t("home.title") // O(1), zero allocation
 * ```
 *
 * @example Raw translator binding (hot-path only)
 * ```ts
 * const lokat = createLokat({ resolveLocaleUrl: (l) => `/locales/${l}.json` })
 * const t = lokat.createT(await lokat.load("en"))
 *
 * // Call t many times in hot paths; cost is a single property read.
 * for (let i = 0; i < 100_000; i++) t("ui.ok")
 * ```
 */
export function createLokat(options: LokatOptions): LokatInstance {
  const { resolveLocaleUrl } = options
  // Prefer provided fetcher; fallback to globalThis.fetch if available.
  const fetcher =
    options.fetcher ?? (globalThis.fetch as (input: string) => Promise<{ json(): unknown }>)

  // Instance-scoped cache: locale -> Promise<dict>
  const cache = new Map<string, Promise<Record<string, string>>>()

  /**
   * Internal: load dictionary for a locale, with instance-level caching.
   */
  function load(locale: string): Promise<Record<string, string>> {
    let promise = cache.get(locale)
    if (!promise) {
      const url = resolveLocaleUrl(locale)
      // Defer to provided fetcher; no runtime validation for minimal overhead.
      const p = fetcher(url).then((r) => r.json() as Promise<Record<string, string>>)
      // Prevent cache poisoning: if the loader rejects, remove entry so future
      // attempts can retry instead of reusing a rejected promise.
      const wrapped = p.catch((err) => {
        cache.delete(locale)
        throw err
      })
      promise = wrapped
      cache.set(locale, promise)
    }
    return promise
  }

  /**
   * Internal: create an O(1) translator bound to a given dictionary.
   */
  function createT(dict: Record<string, string>) {
    return (key: string): string => dict[key] ?? key
  }

  return { load, createT }
}

/**
 * Alias for consumers who prefer discovery via `CreateLokatOptions`.
 */
export type { LokatOptions as CreateLokatOptions }

/**
 * Extreme-mode translator for readonly arrays (integer keyspace).
 * Upper bound performance; no fallback — out-of-bounds yields `undefined`.
 * Suitable for build-time codegen outputs.
 *
 * @example
 * const arr = Object.freeze(["OK", "Cancel"]) as const
 * const tId = createTA(arr)
 * tId(0) // "OK"
 */
export function createTA(arr: readonly string[]): (id: number) => string {
  return (id: number): string => arr[id] as string
}
