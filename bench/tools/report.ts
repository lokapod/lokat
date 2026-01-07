import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { getRuntimeInfo } from "./runtime"

export interface ReportEnvelope<T> {
  runtime: ReturnType<typeof getRuntimeInfo>
  payload: T
}

export function writeReport<T>(category: string, name: string, data: T): string {
  const ts =
    process.env.BENCH_TS || new Date().toISOString().replaceAll(":", "").replaceAll(".", "")
  const dir = join(process.cwd(), "report", category, ts)
  mkdirSync(dir, { recursive: true })
  const env: ReportEnvelope<T> = { runtime: getRuntimeInfo(), payload: data }
  const file = join(dir, `${name}.json`)
  writeFileSync(file, JSON.stringify(env, null, 2))
  return file
}
