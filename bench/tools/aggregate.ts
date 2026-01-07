import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

function latestDir(root: string): string | undefined {
  const entries = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())
  if (!entries.length) return undefined
  entries.sort((a, b) => (a.name < b.name ? 1 : -1))
  return join(root, entries[0].name)
}

export function aggregateReports(): string | undefined {
  const categories = ["micro", "meso", "macro"]
  const reportRoot = join(process.cwd(), "report")
  const payload: Record<string, unknown[]> = {}

  for (const cat of categories) {
    const catDir = join(reportRoot, cat)
    let latest = undefined as string | undefined
    try {
      latest = latestDir(catDir)
    } catch {}
    if (!latest) continue
    const files = readdirSync(latest)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(latest, f))
      .sort()
    payload[cat] = files.map((f) => JSON.parse(readFileSync(f, "utf8")))
  }

  const outDir = join(
    reportRoot,
    "aggregate",
    new Date().toISOString().replaceAll(":", "").replaceAll(".", ""),
  )
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, "benchmark_report.json")
  writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), payload }, null, 2),
  )
  return outFile
}

if (import.meta.main) {
  const file = aggregateReports()
  if (file) console.log("Aggregated report:", file)
}
