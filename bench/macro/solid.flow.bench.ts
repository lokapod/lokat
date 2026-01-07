import { createSolidLokat } from "../../packages/solid/src/index"
import { writeReport } from "../tools/report"
import { runSuite } from "../tools/tinybench"

function dictL(l: string): Record<string, string> {
  const d: Record<string, string> = {}
  for (let i = 0; i < 3000; i++) d[`k${i}`] = `${l}-${i}`
  return d
}

export async function main() {
  const loc = createSolidLokat({
    initialLocale: "en",
    initialDict: dictL("en"),
    loadLocale: async (l) => dictL(String(l)),
  })

  const suite = await runSuite("solid.flow.end2end", [
    {
      name: "preload_then_setLocale_fr",
      fn: async () => {
        await loc.preload("fr")
        await loc.setLocale("fr")
        // hot-path translate burst
        const d = loc.dictRef()
        for (let i = 0; i < 1000; i++) d[`k${i % 3000}`]
      },
      timeMs: 500,
      warmupMs: 150,
    },
    {
      name: "translate_burst_current_locale",
      fn: () => {
        const d = loc.dictRef()
        for (let i = 0; i < 5000; i++) d[`k${i % 3000}`]
      },
      timeMs: 500,
      warmupMs: 150,
    },
  ])

  const file = writeReport("macro", "solid.flow.end2end", suite)
  console.log("Wrote:", file)
}

if (import.meta.main) main()
