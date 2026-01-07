import { createSolidLokat } from "../../packages/solid/src/index"
import { writeReport } from "../tools/report"
import { runSuite } from "../tools/tinybench"

function dictL(l: string): Record<string, string> {
  return { hello: `hello-${l}`, a: "1", b: "2" }
}

export async function main() {
  // Fresh instance per run for clean cache behavior
  const make = () =>
    createSolidLokat({
      initialLocale: "en",
      initialDict: dictL("en"),
      loadLocale: async (l: string) => dictL(String(l)),
    })

  const locUncached = make()
  const suite1 = await runSuite("solid.preload.uncached", [
    {
      name: "preload_fr_uncached",
      fn: async () => {
        await locUncached.preload("fr")
      },
      timeMs: 500,
      warmupMs: 150,
    },
  ])
  const file1 = writeReport("meso", "solid.preload.uncached", suite1)
  console.log("Wrote:", file1)

  const locCached = make()
  await locCached.preload("fr")
  const suite2 = await runSuite("solid.preload.cached", [
    {
      name: "preload_fr_cached",
      fn: async () => {
        await locCached.preload("fr")
      },
      timeMs: 500,
      warmupMs: 150,
    },
  ])
  const file2 = writeReport("meso", "solid.preload.cached", suite2)
  console.log("Wrote:", file2)
}

if (import.meta.main) main()
