# @lokat/solid

SolidJS adapter for the ultra-lightweight `@lokat/core`. Reactive by design, zero overhead on the hot-path, and safe across SSR/CSR/edge.

- Reactive: `createSignal` + `createMemo`, instant locale switch
- Hot-path: `t(key)` stays `dict[key] ?? key`
- SSR/CSR/hybrid safe: instance-scoped, no globals
- Locale is opaque: any type you need
- Dev-only DX: hooks removed from production builds

## Install

```sh
bun add @lokat/solid
# peer dep (expected in your app)
bun add solid-js
```

## API

```ts
import { createSolidLokat } from "@lokat/solid"

interface SolidLokatOptions<L = unknown> {
  initialLocale: L
  initialDict?: Record<string, string>
  loadLocale: (locale: L) => Promise<Record<string, string>>
  dev?: {
    disableCache?: boolean
    onLocaleChange?: (locale: L) => void
    onError?: (error: unknown, locale: L) => void
  }
}

interface SolidLokatInstance<L = unknown> {
  t: (key: string) => string
  locale: () => L
  setLocale: (l: L) => Promise<Record<string, string>>
  preload: (l: L) => Promise<Record<string, string>>
}
```

## Usage (CSR)

```ts
import { createSolidLokat } from "@lokat/solid"

const i18n = createSolidLokat({
  initialLocale: "en",
  loadLocale: async (l) => (await fetch(`/locales/${l}.json`)).json()
})

// translate in components
const title = i18n.t("home.title")

// switch locale
await i18n.setLocale("id")
```

## Usage (SSR hydration)

```ts
const dict = getSSRDictForLocale("en") // injected at render time
const i18n = createSolidLokat({
  initialLocale: "en",
  initialDict: dict,
  loadLocale: async (l) => (await fetch(`/locales/${l}.json`)).json()
})
```

## Preload before navigation

```ts
await i18n.preload("id")
```

## Performance Guarantees

- Translation: O(1), zero allocation per call
- Locale change: instant re-render of `t` consumers
- Cache: one load per locale (unless `disableCache`)

## License

MIT
