import { readdirSync, rmSync } from "node:fs"
import { join } from "node:path"

function pruneCategory(root: string, keep: number) {
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => (a < b ? 1 : -1))

  const toDelete = dirs.slice(keep)
  for (const d of toDelete) {
    const p = join(root, d)
    rmSync(p, { recursive: true, force: true })
    console.log("Pruned:", p)
  }
}

export function main(keep: number) {
  const categories = ["micro", "meso", "macro", "aggregate"]
  const reportRoot = join(process.cwd(), "report")
  for (const cat of categories) {
    try {
      pruneCategory(join(reportRoot, cat), keep)
    } catch {
      // ignore
    }
  }
}

if (import.meta.main) {
  const n = Number(process.argv[2] ?? 3)
  main(Number.isFinite(n) && n > 0 ? n : 3)
}
