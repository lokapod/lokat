// Import from source for local benchmarking
import { createLokat } from "../../packages/core/src/index"
import { writeReport } from "../tools/report"
import { runSuite } from "../tools/tinybench"

function makeDict(n: number): Record<string, string> {
  const d: Record<string, string> = {}
  for (let i = 0; i < n; i++) d[`k${i}`] = `v${i}`
  return d
}

export async function main() {
  const { createT } = createLokat({ resolveLocaleUrl: (l) => l })
  const sizes = [100, 10_000, 50_000]
  for (const size of sizes) {
    const dict = makeDict(size)
    const t = createT(dict)
    const hitKey = `k${Math.floor(size / 2)}`
    const missKey = "_missing_"
    const suite = await runSuite(`core.translate.size_${size}`, [
      {
        name: "t_hit",
        fn: () => {
          t(hitKey)
        },
        timeMs: 500,
        warmupMs: 150,
      },
      {
        name: "t_miss",
        fn: () => {
          t(missKey)
        },
        timeMs: 500,
        warmupMs: 150,
      },
    ])
    const file = writeReport("micro", `core.translate.size_${size}`, suite)
    console.log("Wrote:", file)
  }
}

if (import.meta.main) main()
