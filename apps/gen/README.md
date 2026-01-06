# @lokat/gen — Integer Keyspace i18n Code Generator

**Blazing-fast, zero-overhead i18n** powered by integer keyspaces.

`@lokat/gen` converts plain JSON locale files into **compile-time const enums** and **frozen readonly arrays**, giving you predictable IDs, tiny bundles, and O(1) lookups — with _no runtime object maps_.

Designed for performance-critical frontends and frameworks that care about every byte.

## Why Integer Keyspaces?

Traditional i18n uses string keys at runtime. That means:

- hash lookups
- larger bundles
- weaker refactoring guarantees

`@lokat/gen` flips the model:

- Keys → **integers**
- Lookups → **array indexing**
- Safety → **TypeScript at compile time**

The result: _faster, smaller, and stricter_ i18n.

## Supported Input Layouts

You can organize locale files however feels natural:

### Nested

```
locales/
├── en/
│   ├── auth.json
│   └── common.json
└── id/
    ├── auth.json
    └── common.json
```

### Flat

```
locales/
├── en.auth.json
├── en.common.json
├── id.auth.json
└── id.common.json
```

### File Format Rules

Each JSON file must be:

```ts
Record<string, string>;
```

> [!Important]
> The key order in the **reference locale** defines the integer IDs.
> Order is sacred. Reordering keys = changing IDs.

## Generated Output

For every namespace, `@lokat/gen` emits:

### 1. Key Enums

```
i18n.keys.ts
```

```ts
export const enum CommonK {
  Ok = 0,
  Cancel = 1,
}
```

- `const enum` → erased at runtime
- Zero lookup cost
- Fully type-safe

### 2. Locale Arrays

```
<locale>.<namespace>.generated.ts
```

```ts
export const COMMON_EN = Object.freeze(["OK", "Cancel"]) as const;
```

- Immutable
- Tree-shakable
- Perfect for array-based translators

## Usage

### CLI (via `npx`)

```sh
npx @lokat/gen \
  --in ./locales \
  --out ./i18n/generated \
  --locales en,id \
  --ref en
```

### Programmatic API

```ts
import { generate } from "@lokat/gen";

await generate({
  inputDir: "./locales",
  outputDir: "./i18n/generated",
  locales: ["en", "id"],
  refLocale: "en",
});
```

## CLI Options

| Option      | Description                             |
| ----------- | --------------------------------------- |
| `--in`      | Input locales directory                 |
| `--out`     | Output directory for generated files    |
| `--locales` | Comma-separated locale list             |
| `--ref`     | Reference locale that defines key order |

## Validation & Guarantees

`@lokat/gen` is intentionally strict.

It will:

- ✔ Ensure every locale has **exactly the same namespaces**
- ✔ Ensure **key count and order** match the reference locale
- ✖ Emit detailed diagnostics on mismatch
- ✖ Exit with a non-zero code on failure

This makes it CI-friendly and refactor-safe.

## Design Notes

- Arrays are emitted as
  `Object.freeze([...]) as const` for runtime safety
- `const enum` ensures **zero runtime cost**
- No dependency on runtime key maps
- Output is deterministic and reproducible

## Recommended Pairing

For maximum performance, combine with:

**`@lokat/solid-x` (array-mode lokat solid adapter)**

```ts
t(id: number): string
```

This yields:

- No object allocations
- No string hashing
- Just raw array access

## License

[MIT](https://github.com/lokapod/lokat/blob/main/LICENSE) © 2026 KazViz and Lokapod (under the stewardship of Nazahex, Nazator, and Nazaxis).
