import { createSolidLokat } from "../../packages/solid-x/src/index"
import { writeReport } from "../tools/report"
import { runSuite } from "../tools/tinybench"

function makeArray(n: number): readonly string[] {
  const arr: string[] = new Array(n)
  for (let i = 0; i < n; i++) arr[i] = `v${i}`
  return arr
}

export async function main() {
  const sizes = [100, 10_000, 50_000]
  for (const size of sizes) {
    const dict = makeArray(size)
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: dict,
      loadLocale: async () => dict,
    })
    const hitId = Math.floor(size / 2)
    const missId = size + 10 // out of bounds: deliberate miss
    const suite = await runSuite(`solid-x.translate.size_${size}`, [
      {
        name: "t_hit",
        fn: () => {
          loc.t(hitId)
        },
        timeMs: 500,
        warmupMs: 150,
      },
      {
        name: "t_miss",
        fn: () => {
          loc.t(missId)
        },
        timeMs: 500,
        warmupMs: 150,
      },
      {
        name: "dictRef_hit",
        fn: () => {
          const a = loc.dictRef()
          // single read using raw array index
          void a[hitId]
        },
        timeMs: 500,
        warmupMs: 150,
      },
      {
        name: "dictRef_miss",
        fn: () => {
          const a = loc.dictRef()
          void a[missId]
        },
        timeMs: 500,
        warmupMs: 150,
      },
    ])
    const file = writeReport("micro", `solid-x.translate.size_${size}`, suite)
    console.log("Wrote:", file)
  }
}

if (import.meta.main) main()
