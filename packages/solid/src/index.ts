import { createSignal } from "solid-js"

export interface SolidLokatOptions<L = unknown> {
  initialLocale: L
  initialDict?: Record<string, string>
  loadLocale: (locale: L) => Promise<Record<string, string>>
  dev?: {
    disableCache?: boolean
    onLocaleChange?: (locale: L) => void
    onError?: (error: unknown, locale: L) => void
  }
}

export interface SolidLokatInstance<L = unknown> {
  t: (key: string) => string
  locale: () => L
  setLocale: (l: L) => Promise<Record<string, string>>
  preload: (l: L) => Promise<Record<string, string>>
}

type Dict = Record<string, string>

export function createSolidLokat<L = unknown>(
  options: SolidLokatOptions<L>,
): SolidLokatInstance<L> {
  const [locale, setLocaleSignal] = createSignal<L>(options.initialLocale)
  const [dict, setDict] = createSignal<Dict>(options.initialDict ?? {})

  // Instance-scoped cache: locale -> Promise<Dict>
  const cache = new Map<L, Promise<Dict>>()

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

  function t(key: string): string {
    const d = dict()
    return d[key] ?? key
  }

  function set(l: L): Promise<Dict> {
    // Use updater form to satisfy Solid's `Exclude<T, Function>` constraint
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

  return {
    t,
    locale,
    setLocale: set,
    preload,
  }
}
