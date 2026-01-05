import { join } from "node:path"
import { emitAll } from "./emit.ts"
import { loadLayout } from "./util.ts"
import { validateAndOrder } from "./validate.ts"

function parseArgs(argv: string[]) {
  const args = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--")) {
      const key = a.slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true"
      args.set(key, val)
    }
  }
  return args
}

function help() {
  console.log(
    `@lokat/gen — integer keyspace codegen\n\nUsage:\n  bun run src/cli.ts -- --in ./locales --out ./i18n/generated --locales en,id --ref en\n\nOptions:\n  --in       Input directory containing locale JSONs\n  --out      Output directory for generated TS files\n  --locales  Comma-separated locale codes (e.g., en,id)\n  --ref      Reference locale for key order (e.g., en)\n`,
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.has("help") || args.size === 0) return help()

  const inputDir = args.get("in") || "./locales"
  const outputDir = args.get("out") || "./i18n/generated"
  const locales = (args.get("locales") || "en")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const refLocale = args.get("ref") || locales[0]

  const layout = await loadLayout(inputDir, locales)
  const res = validateAndOrder(layout, refLocale)
  if (res.issues.length) {
    console.error("Validation issues detected:")
    for (const it of res.issues) {
      console.error(`- [${it.locale}/${it.namespace}] ${it.message}`)
    }
    process.exitCode = 1
  }

  emitAll(outputDir, layout, res, locales)
  console.log(`Generated to: ${join(process.cwd(), outputDir)}`)
}

main()
