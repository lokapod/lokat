import { createSignal } from "solid-js"

/**
 * Options for `createSolidLokat` — Solid-first localization.
 *
 * Reactivity & Hydration
 * - `initialDict` avoids a flash during hydration by seeding the dictionary.
 * - `initialLocale` seeds the locale signal; if `initialDict` is absent, it will
 *   asynchronously load the initial locale (fire-and-forget).
 *
 * Loader Contract
 * - `loadLocale(locale)` must resolve to a flat dictionary `{ key: value }`.
 * - You control how the dictionary is retrieved: `fetch`, import, in-memory, etc.
 *
 * Dev-only Hooks (removed from prod builds by bundlers)
 * - `disableCache`: forces every `preload`/`setLocale` to re-load.
 * - `onLocaleChange`: invoked when `setLocale` is called (before loading).
 * - `onError`: invoked if loading fails; `setLocale` will reject.
 *
 * @typeParam L Opaque locale type (string, object, enum, snapshot, etc.).
 */
export interface SolidLokatOptions<L = unknown> {
  /** Initial locale (opaque type) used to seed the signal. */
  initialLocale: L
  /** Optional dictionary to avoid hydration flash and immediate network I/O. */
  initialDict?: Record<string, string>
  /** Locale loader returning a flat dictionary. */
  loadLocale: (locale: L) => Promise<Record<string, string>>
  /** Development-only diagnostics and behavior tweaks. */
  dev?: {
    /** Disable instance cache entirely (dev); production should leave this off. */
    disableCache?: boolean
    /** Callback fired before a new locale is loaded via `setLocale`. */
    onLocaleChange?: (locale: L) => void
    /** Callback fired when a load attempt fails; `setLocale` will reject. */
    onError?: (error: unknown, locale: L) => void
  }
}

/**
 * Public API returned by `createSolidLokat`.
 *
 * - `t(key)`: Reads the current dictionary and returns the localized string or the key.
 * - `locale()`: A Solid signal getter returning the current locale.
 * - `setLocale(l)`: Updates the locale, emits hooks, loads the dictionary, updates signals.
 * - `preload(l)`: Loads and caches the dictionary without changing the current locale.
 */
export interface SolidLokatInstance<L = unknown> {
  /** Translator: O(1) lookup `dict[key] ?? key`; zero allocation per call. */
  t: (key: string) => string
  /** Locale signal getter: reactive in Solid components. */
  locale: () => L
  /**
   * Set a new locale and load its dictionary.
   * @param l The next locale.
   * @returns The loaded dictionary.
   */
  setLocale: (l: L) => Promise<Record<string, string>>
  /**
   * Preload a locale's dictionary without changing the current locale.
   * @param l The locale to preload.
   * @returns The loaded dictionary.
   */
  preload: (l: L) => Promise<Record<string, string>>
}

type Dict = Record<string, string>

/**
 * Create a Solid localization instance.
 *
 * Design
 * - Reactive by default using `createSignal`; no hidden global state.
 * - Hot-path: O(1) lookup `dict[key] ?? key`.
 * - SSR/CSR/Edge compatible: the loader is fully controlled by the consumer.
 *
 * Caching
 * - Instance-scoped `Map<L, Promise<Dict>>` ensures single-flight per locale.
 * - Set `dev.disableCache` to force reloads in development workflows.
 *
 * @example CSR hydration without flash (seed with `initialDict`)
 * ```ts
 * import { createSolidLokat } from "@lokat/solid"
 *
 * const en = { hello: "Hello", welcome: "Welcome" }
 * const loc = createSolidLokat({
 *   initialLocale: "en",
 *   initialDict: en,
 *   loadLocale: async (l) => {
 *     const r = await fetch(`/i18n/${l}.json`)
 *     return r.json()
 *   },
 * })
 *
 * // In components
 * loc.t("hello") // => "Hello"
 * ```
 *
 * @example SSR/Edge per-request instance with preloaded dict
 * ```ts
 * import { createSolidLokat } from "@lokat/solid"
 *
 * // server-side handler
 * export async function handle(req: Request) {
 *   const locale = detectLocale(req)
 *   const dict = await loadFromKV(locale) // or fs/import/cache
 *
 *   const loc = createSolidLokat({
 *     initialLocale: locale,
 *     initialDict: dict,
 *     loadLocale: async (l) => loadFromKV(l),
 *   })
 *
 *   // render using `loc.t(...)` and serialize `dict` for hydration
 * }
 * ```
 *
 * @example Precompiled dictionary (maximum runtime performance)
 * ```ts
 * import { createSolidLokat } from "@lokat/solid"
 * import dictEn from "./dicts/en.json" assert { type: "json" }
 *
 * const loc = createSolidLokat({
 *   initialLocale: "en",
 *   initialDict: dictEn,
 *   loadLocale: async () => dictEn, // no network, no parsing at runtime
 * })
 *
 * // Hot-path translations are pure object lookups
 * loc.t("welcome")
 * ```
 *
 * @example Router preload before navigation (instant locale switch)
 * ```ts
 * import { createSolidLokat } from "@lokat/solid"
 * const loc = createSolidLokat({
 *   initialLocale: "en",
 *   loadLocale: async (l) => fetch(`/i18n/${l}.json`).then((r) => r.json()),
 * })
 *
 * // before navigating to a French route
 * await loc.preload("fr")
 * await loc.setLocale("fr") // cache hit; UI updates immediately
 * ```
 *
 * @typeParam L Opaque locale type (string or non-string).
 * @param options Adapter configuration (initial locale, optional initial dict, loader, dev hooks).
 * @returns Solid instance providing `t`, `locale()`, `setLocale`, and `preload`.
 */
export function createSolidLokat<L = unknown>(
  options: SolidLokatOptions<L>,
): SolidLokatInstance<L> {
  const [locale, setLocaleSignal] = createSignal<L>(options.initialLocale)
  const [dict, setDict] = createSignal<Dict>(options.initialDict ?? {})

  // Instance-scoped cache: locale -> Promise<Dict>
  const cache = new Map<L, Promise<Dict>>()

  /**
   * Internal: load dictionary for locale `l`, respecting dev cache settings.
   */
  async function load(l: L): Promise<Dict> {
    if (!options.dev?.disableCache) {
      const cached = cache.get(l)
      if (cached) {
        const d = await cached
        setDict(d)
        return d
      }
    }
    const promise = options.loadLocale(l)
    if (!options.dev?.disableCache) cache.set(l, promise)
    const d = await promise
    setDict(d)
    return d
  }

  // Initial hydrate: avoid flash if initialDict present, else load initialLocale
  if (!options.initialDict) {
    // Fire and forget; caller can await setLocale for deterministic flow
    void load(options.initialLocale)
  }

  /** Translator: reads the current dictionary signal for an O(1) lookup. */
  function t(key: string): string {
    const d = dict()
    return d[key] ?? key
  }

  /** Set a new locale; fires hooks and updates dictionary upon load. */
  function set(l: L): Promise<Dict> {
    // Use updater form to satisfy Solid's `Exclude<T, Function>` constraint
    setLocaleSignal(() => l as L)
    options.dev?.onLocaleChange?.(l)
    return load(l).catch((e) => {
      options.dev?.onError?.(e, l)
      throw e
    })
  }

  /** Preload a locale dictionary into the instance cache without changing locale. */
  function preload(l: L): Promise<Dict> {
    if (!options.dev?.disableCache) {
      const cached = cache.get(l)
      if (cached) return cached
    }
    const promise = options.loadLocale(l)
    if (!options.dev?.disableCache) cache.set(l, promise)
    return promise
  }

  return {
    t,
    locale,
    setLocale: set,
    preload,
  }
}
