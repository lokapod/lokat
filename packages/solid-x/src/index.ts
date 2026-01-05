import { createSignal } from "solid-js"

/**
 * Options for `createSolidLokat` — Solid-first, extreme array-mode localization.
 *
 * Reactivity & Hydration
 * - `initialDict` seeds the readonly string array to avoid hydration flash.
 * - `initialLocale` seeds the locale signal; if `initialDict` is absent, it will
 *   asynchronously load the initial locale (fire-and-forget).
 *
 * Loader Contract
 * - `loadLocale(locale)` must resolve to a readonly string array, where indexes are integer IDs.
 * - You control how the array is retrieved: `fetch`, import, in-memory, or build-time codegen.
 *
 * Dev-only Hooks (removed from prod builds by bundlers)
 * - `disableCache`: forces every `preload`/`setLocale` to re-load without using the instance cache.
 * - `onLocaleChange`: invoked when `setLocale` is called (before loading begins).
 * - `onError`: invoked if loading fails; `setLocale` will reject with the error.
 *
 * @typeParam L Opaque locale type (string, enum, object snapshot, etc.).
 */
export interface SolidLokatOptions<L = unknown> {
  /** Initial locale (opaque type) used to seed the signal. */
  initialLocale: L
  /** Optional readonly array to avoid hydration flash and immediate network I/O. */
  initialDict?: readonly string[]
  /** Locale loader returning a readonly array of strings, addressed by integer IDs. */
  loadLocale: (locale: L) => Promise<readonly string[]>
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
 * Public API returned by `createSolidLokat` (array-mode).
 *
 * - `t(id)`: Pure O(1) array index lookup without reactive tracking.
 * - `locale()`: A Solid signal getter returning the current locale.
 * - `setLocale(l)`: Updates the locale, emits hooks, loads the array, updates signals.
 * - `preload(l)`: Loads and caches the array without changing the current locale.
 */
export interface SolidLokatInstance<L = unknown> {
  /** Translator: O(1) lookup `arr[id]`; zero allocation per call. No fallback. */
  t: (id: number) => string
  /** Locale signal getter: reactive in Solid components. */
  locale: () => L
  /** Set a new locale and load its array; returns the loaded array. */
  setLocale: (l: L) => Promise<readonly string[]>
  /** Preload a locale's array without changing the current locale. */
  preload: (l: L) => Promise<readonly string[]>
}

type Dict = readonly string[]

/**
 * Create a Solid localization instance (extreme array-mode, integer keyspace).
 *
 * Design
 * - Integer keyspace backed by readonly arrays; ideal for codegen (`apps/gen`) outputs.
 * - Hot-path: pure O(1) array index lookup without reactive tracking; zero allocation.
 * - SSR/CSR/Edge compatible: the loader is fully controlled by the consumer.
 *
 * Caching
 * - Instance-scoped `Map<L, Promise<readonly string[]>>` ensures single-flight per locale.
 * - Set `dev.disableCache` to force reloads in development workflows.
 *
 * @example Basic usage with precompiled array
 * ```ts
 * import { createSolidLokat } from "@lokat/solid-x"
 * import { COMMON_EN } from "./i18n/en.common.generated" // readonly string[]
 *
 * const loc = createSolidLokat({
 *   initialLocale: "en",
 *   initialDict: COMMON_EN,
 *   loadLocale: async () => COMMON_EN,
 * })
 *
 * loc.t(0) // => "OK"
 * ```
 *
 * @example With codegen IDs (maximum runtime performance)
 * ```ts
 * import { createSolidLokat } from "@lokat/solid-x"
 * import { COMMON } from "./i18n.keys" // const enum ids
 * import { COMMON_EN, COMMON_ID } from "./i18n.generated" // readonly arrays
 *
 * const loc = createSolidLokat({
 *   initialLocale: "en",
 *   initialDict: COMMON_EN,
 *   loadLocale: async (l) => (l === "en" ? COMMON_EN : COMMON_ID),
 * })
 *
 * loc.t(COMMON.OK)
 * ```
 *
 * @typeParam L Opaque locale type (string or non-string).
 * @param options Adapter configuration (initial locale, optional initial array, loader, dev hooks).
 * @returns Solid instance providing `t`, `locale()`, `setLocale`, and `preload`.
 */
export function createSolidLokat<L = unknown>(
  options: SolidLokatOptions<L>,
): SolidLokatInstance<L> {
  const [locale, setLocaleSignal] = createSignal<L>(options.initialLocale)
  let currentDict: Dict = options.initialDict ?? []
  const [_dictSignal, setDictSignal] = createSignal<Dict>(currentDict)

  const cache = new Map<L, Promise<Dict>>()

  function setDictInternal(d: Dict) {
    if (currentDict !== d) {
      currentDict = d
      setDictSignal(d)
    }
  }

  async function load(l: L): Promise<Dict> {
    if (!options.dev?.disableCache) {
      const cached = cache.get(l)
      if (cached) {
        const d = await cached
        setDictInternal(d)
        return d
      }
    }
    const promise = options.loadLocale(l)
    if (!options.dev?.disableCache) cache.set(l, promise)
    const d = await promise
    setDictInternal(d)
    return d
  }

  if (!options.initialDict) {
    void load(options.initialLocale)
  }

  function t(id: number): string {
    // No fallback: invalid id results in undefined; by design for fail-fast.
    return currentDict[id] as string
  }

  function set(l: L): Promise<Dict> {
    setLocaleSignal(() => l as L)
    options.dev?.onLocaleChange?.(l)
    return load(l).catch((e) => {
      options.dev?.onError?.(e, l)
      throw e
    })
  }

  function preload(l: L): Promise<Dict> {
    if (!options.dev?.disableCache) {
      const cached = cache.get(l)
      if (cached) return cached
    }
    const promise = options.loadLocale(l)
    if (!options.dev?.disableCache) cache.set(l, promise)
    return promise
  }

  return { t, locale, setLocale: set, preload }
}
