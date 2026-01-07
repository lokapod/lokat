import { createSolidLokat } from "../../packages/solid/src/index"
import { writeReport } from "../tools/report"
import { runSuite } from "../tools/tinybench"

function dictL(l: string): Record<string, string> {
  const base: Record<string, string> = {}
  for (let i = 0; i < 2000; i++) base[`k${i}`] = `${l}-${i}`
  return base
}

export async function main() {
  const loc = createSolidLokat({
    initialLocale: "en",
    initialDict: dictL("en"),
    loadLocale: async (l) => dictL(String(l)),
  })

  // Warm caches
  await loc.preload("fr")

  const suite = await runSuite("solid.setLocale.cached", [
    {
      name: "setLocale_fr_cached",
      fn: async () => {
        await loc.setLocale("fr")
      },
      timeMs: 500,
      warmupMs: 150,
    },
    {
      name: "setLocale_en_cached",
      fn: async () => {
        await loc.setLocale("en")
      },
      timeMs: 500,
      warmupMs: 150,
    },
  ])

  const file = writeReport("meso", "solid.setLocale.cached", suite)
  console.log("Wrote:", file)
}

if (import.meta.main) main()
