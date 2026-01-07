import { createTA } from "../../packages/core/src/index"
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
    const arr = makeArray(size)
    const tId = createTA(arr)
    const hitId = Math.floor(size / 2)
    const missId = size + 10
    const suite = await runSuite(`core.array.translate.size_${size}`, [
      {
        name: "t_hit",
        fn: () => {
          tId(hitId)
        },
        timeMs: 500,
        warmupMs: 150,
      },
      {
        name: "t_miss",
        fn: () => {
          tId(missId)
        },
        timeMs: 500,
        warmupMs: 150,
      },
    ])
    const file = writeReport("micro", `core.array.translate.size_${size}`, suite)
    console.log("Wrote:", file)
  }
}

if (import.meta.main) main()
