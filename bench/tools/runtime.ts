import os from "node:os"

export interface RuntimeInfo {
  runtime: string
  runtimeVersion: string
  os: { platform: string; release: string; arch: string }
  cpu: { model: string; cores: number }
  memory: { totalGB: number }
}

export function getRuntimeInfo(): RuntimeInfo {
  type BunGlobal = { Bun?: { version: string } }
  const bunMaybe = globalThis as BunGlobal
  const isBun = typeof bunMaybe.Bun !== "undefined"
  const runtime = isBun ? "bun" : "node"
  const runtimeVersion = isBun ? bunMaybe.Bun?.version : process.versions.node
  const cpus = os.cpus()
  return {
    runtime,
    runtimeVersion: runtimeVersion ?? "unknown",
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    cpu: { model: cpus?.[0]?.model ?? "unknown", cores: cpus?.length ?? 0 },
    memory: { totalGB: Math.round((os.totalmem() / 1024 ** 3) * 100) / 100 },
  }
}
