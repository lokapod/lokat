# @lokat/core

Ultra-lightweight i18n core designed for maximum runtime performance, minimal latency, and tiny size — without framework assumptions.

- Framework-agnostic core (no React/Svelte/Solid knowledge)
- No global mutable state, SSR/Edge safe by default
- Single fetch per locale (instance cache)
- O(1) translation lookup, zero allocation per call
- Flat dictionary only: `{ "a.b": "..." }`

## Install

```sh
# using npm
npm install @lokat/core
# or pnpm
pnpm add @lokat/core
# or bun
bun add @lokat/core
```

## Quick Start

```ts
import { createLokat } from "@lokat/core";

const i18n = createLokat({
  resolveLocaleUrl: (locale) => `/locales/${locale}.json`,
  // fetcher?: customFetch // optional, defaults to global fetch when available
});

const dict = await i18n.load("en");
const t = i18n.createT(dict);

console.log(t("home.title")); // => "Welcome" (or key if missing)
```

Dictionary format (flat keys):

```json
{
  "home.title": "Welcome",
  "home.subtitle": "Fast. Small. Predictable."
}
```

## API

- `createLokat(options): LokatInstance`
  - `resolveLocaleUrl(locale: string): string` — required URL resolver
  - `fetcher?(input: string): Promise<{ json(): unknown }>` — optional fetch function
- `LokatInstance.load(locale: string): Promise<Record<string, string>>` — loads and caches dictionary per locale
- `LokatInstance.createT(dict): (key: string) => string` — returns a translator: `dict[key] ?? key`

## Design Principles

- Pure function hot-path; no class/proxy/reflection
- No nested key resolution, no ICU/plural/gender in core
- All advanced features belong in adapters or build-time tools

## Adapters (Optional)

Adapters for Solid/Svelte/React can wrap this core with minimal reactive glue. They do not alter hot-path costs.

## License

MIT
