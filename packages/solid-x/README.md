# @lokat/solid-x — Extreme Solid i18n

**Integer keyspace + readonly arrays for zero-cost runtime lookups.**\
Built _Solid-first_, designed for **maximum throughput** across SSR, CSR, and Edge.

This is not a traditional string-key i18n helper.\
This is an **array-backed localization engine** optimized for the hot path.

## Why `@lokat/solid-x`

Most i18n libraries optimize for flexibility first, performance second.\
This package flips that priority — **performance is the baseline**, ergonomics are layered on top.

**Design goals**

- **Maximum runtime throughput** with minimal abstraction cost.
- **Zero-allocation hot path**: translations resolve to a single array index lookup.
- **Clear reactive boundary**: locale changes are reactive; translation reads are not.
- **Solid-native**: respects signals, hydration, and ownership without leaking reactivity.
- **Fully user-controlled loading**: fetch, import, memory, or build-time codegen.

If you already knows your keyspace at build time, this is the fastest shape i18n can take in JavaScript.

## Quick start

```ts
import { createSolidLokat } from "@lokat/solid-x";

const loc = createSolidLokat({
  initialLocale: "en",
  initialDict: COMMON_EN, // readonly string[] (usually from codegen)
  loadLocale: async (l) => (l === "en" ? COMMON_EN : COMMON_ID),
});

loc.t(CommonK.OK); // => "OK"
```

## Mental model

- **Keys are integers**, not strings.
- **Translations live in readonly arrays**.
- `t(id)` is just `array[id]`.
- Locale changes swap the array reference.
- Reactivity exists **only** at the locale boundary.

Everything else is intentionally boring — so the engine can be fast.

## API overview

### Options

```ts
createSolidLokat<L>({
  initialLocale: L
  initialDict?: readonly string[]
  loadLocale: (locale: L) => Promise<readonly string[]>
  dev?: {
    disableCache?: boolean
    onLocaleChange?: (l: L) => void
    onError?: (e: unknown, l: L) => void
  }
})
```

**Notes**

- `initialDict` avoids hydration flash and initial async work.
- `loadLocale` defines _how_ dictionaries are obtained — nothing is assumed.
- `dev` hooks are intended for diagnostics and are tree-shaken in production.

### Instance

```ts
interface SolidLokatInstance<L> {
  t(id: number): string;
  locale(): L;
  setLocale(l: L): Promise<readonly string[]>;
  preload(l: L): Promise<readonly string[]>;
  dictRef(): readonly string[];
}
```

- **`t(id)`** — hot-path translator; no fallback, no allocations.
- **`locale()`** — Solid signal getter for reactive consumers.
- **`setLocale(l)`** — updates locale signal and loads the dictionary.
- **`preload(l)`** — warms the cache without changing locale.
- **`dictRef()`** — performance escape hatch for tight loops.

## Performance guidance

### Normal usage (recommended)

Use `loc.t(id)` inside components and application code.

```ts
loc.t(CommonK.Save);
```

This path is:

- Monomorphic
- Allocation-free
- JIT-friendly
- Safe with Solid reactivity

### Tight loops & burst workloads

For render loops, parsers, or bulk processing, read the array once:

```ts
const dict = loc.dictRef();

for (let i = 0; i < N; i++) {
  // direct array access — absolute fastest path
  void dict[someId(i)];
}
```

**Important notes**

- `dictRef()` is **non-reactive**.
- It returns a direct reference to the current dictionary array.
- Use it only where you fully controls locality and lifetime.

Internally, the adapter **rebinds the `t` function** when the dictionary changes.
This preserves a monomorphic call site for `loc.t()` while keeping Solid signals intact.

## Using codegen (strongly recommended)

For best cold-start and steady-state performance, generate keys and arrays at build time.

- Use `@lokat/gen` to emit:
  - `const enum` integer IDs
  - frozen readonly arrays

This eliminates runtime parsing, JSON decoding, and shape instability.

### Example generated output

```ts
// i18n.keys.ts
export const enum CommonK {
  OK = 0,
  Cancel = 1,
  Save = 2,
}
```

```ts
// en.common.ts
export const COMMON_EN = Object.freeze(["OK", "Cancel", "Save"] as const);
```

## Wiring example

```ts
import { CommonK } from "./locale/gen/i18n.keys";
import { COMMON_EN } from "./locale/gen/en.common";

const loc = createSolidLokat({
  initialLocale: "en",
  initialDict: COMMON_EN,
  loadLocale: async (l) => (l === "en" ? COMMON_EN : COMMON_ID),
});

// usage
loc.t(CommonK.OK);
```

## Namespaces & scaling

Prefer **small, focused instances per namespace**:

```ts
const common = createSolidLokat({
  initialLocale: "en",
  initialDict: COMMON_EN,
  loadLocale,
});

const auth = createSolidLokat({
  initialLocale: "en",
  initialDict: AUTH_EN,
  loadLocale,
});
```

This:

- Reduces per-instance memory
- Avoids unnecessary signal updates
- Keeps dictionaries compact and cache-friendly

## SSR / Edge guidance

- Precompile dictionaries server-side.
- Hydrate the client with `initialDict` to avoid network and parse costs.
- If dynamic loading is unavoidable, return **frozen arrays** to keep runtime shapes stable.

The adapter itself is environment-agnostic.

## Notes & tradeoffs

- `t(id)` is the safe, default API.
- `dictRef()` exists purely for performance-critical paths.
- Reactivity is preserved by design — Solid consumers expect signals.
- For non-reactive or raw throughput use cases, use the core adapter instead.

## Performance checklist

- ✔ Use codegen arrays + `const enum` IDs.
- ✔ Reuse and freeze arrays.
- ✔ In hot loops, read `dictRef()` once.
- ✖ Avoid creating new arrays or objects per locale switch.

## License

[MIT](https://github.com/lokapod/lokat/blob/main/LICENSE) © 2026 KazViz and Lokapod (under the stewardship of Nazahex, Nazator, and Nazaxis).
