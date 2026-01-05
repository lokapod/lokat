import { existsSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"
import type { InputLayout, LocaleCode, LocaleDict, Namespace } from "./types.ts"

function readJson(file: string): LocaleDict {
  const raw = readFileSync(file, "utf8")
  const obj = JSON.parse(raw)
  return obj as LocaleDict
}

function titleCaseNamespace(ns: string): string {
  return ns
    .split(/[\s._-]+/g)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : ""))
    .join("")
}

function formatEnumName(ns: Namespace): string {
  const t = titleCaseNamespace(ns)
  return `${t}K`
}

function constNameFor(ns: Namespace, locale: LocaleCode): string {
  return `${ns.toUpperCase()}_${locale.toUpperCase()}`
}

// Support two layouts:
// 1) inputDir/<locale>/<namespace>.json
// 2) inputDir/<locale>.<namespace>.json
export async function loadLayout(inputDir: string, locales: LocaleCode[]): Promise<InputLayout> {
  const layout: InputLayout = { locales: new Map() }
  for (const loc of locales) {
    const nsMap = new Map<Namespace, LocaleDict>()
    // try nested layout
    const nested = join(inputDir, loc)
    let found = false
    try {
      const { readdirSync, statSync } = await import("node:fs")
      if (existsSync(nested) && statSync(nested).isDirectory()) {
        for (const f of readdirSync(nested)) {
          if (f.endsWith(".json")) {
            const ns = basename(f, ".json")
            nsMap.set(ns, readJson(join(nested, f)))
            found = true
          }
        }
      }
    } catch {}

    if (!found) {
      const { readdirSync } = await import("node:fs")
      for (const f of readdirSync(inputDir)) {
        if (f.startsWith(`${loc}.`) && f.endsWith(".json")) {
          const ns = f.slice(loc.length + 1, f.length - ".json".length)
          nsMap.set(ns, readJson(join(inputDir, f)))
        }
      }
    }

    layout.locales.set(loc, nsMap)
  }
  return layout
}

export const names = { formatEnumName, constNameFor }
