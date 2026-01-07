import { Bench } from "tinybench"

export interface BenchTask {
  name: string
  fn: () => void | Promise<void>
  warmupMs?: number
  timeMs?: number
}

export interface TaskReport {
  name: string
  hz: number
  mean: number
  variance?: number
  sd?: number
  p95?: number
}

export interface SuiteReport {
  suite: string
  timestamp: string
  tasks: TaskReport[]
}

// Approximate p95 from mean/sd under a normality assumption to avoid storing raw samples
function approxP95(mean?: number, sd?: number): number | undefined {
  if (typeof mean !== "number" || typeof sd !== "number") return undefined
  return mean + 1.645 * sd
}

export async function runSuite(suite: string, tasks: BenchTask[]): Promise<SuiteReport> {
  const defaultTime = tasks[0]?.timeMs ?? 500
  const defaultWarmup = tasks[0]?.warmupMs ?? 150
  const bench = new Bench({ time: defaultTime, warmupTime: defaultWarmup })

  for (const t of tasks) {
    bench.add(t.name, t.fn)
  }

  await bench.run()

  const reports: TaskReport[] = bench.tasks.map((t) => {
    const r = t.result
    const sd = r?.sd
    const variance = typeof sd === "number" ? sd * sd : undefined
    const p95 = approxP95(r?.mean, sd)
    return {
      name: t.name,
      hz: r?.hz ?? NaN,
      mean: r?.mean ?? NaN,
      variance,
      sd,
      p95,
    }
  })

  return { suite, timestamp: new Date().toISOString(), tasks: reports }
}
