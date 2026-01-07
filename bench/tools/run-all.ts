async function run() {
  const scope = process.argv[2] as "micro" | "meso" | "macro" | undefined
  const suites: Array<() => Promise<void>> = []

  if (!scope || scope === "micro") {
    suites.push(async () => (await import("../micro/core.translate.bench")).main())
    suites.push(async () => (await import("../micro/core.array.translate.bench")).main())
    suites.push(async () => (await import("../micro/solid.translate.bench")).main())
    suites.push(async () => (await import("../micro/solid-x.translate.bench")).main())
  }
  if (!scope || scope === "meso") {
    suites.push(async () => (await import("../meso/solid.load-cache.bench")).main())
    suites.push(async () => (await import("../meso/solid.setlocale.bench")).main())
  }
  if (!scope || scope === "macro") {
    suites.push(async () => (await import("../macro/solid.flow.bench")).main())
  }

  for (const s of suites) {
    await s()
  }
}

run()
