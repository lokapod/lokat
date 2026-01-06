import { describe, expect, it } from "bun:test"
import { createSolidLokat } from "../src/index.ts"

const COMMON_EN = Object.freeze(["OK", "Cancel", "Save"] as const)
const COMMON_ID = Object.freeze(["Oke", "Batal", "Simpan"] as const)

describe("@lokat/solid-x createSolidLokat", () => {
  it("hydrates instantly with initialDict and translates by id", () => {
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async () => COMMON_EN,
    })
    expect(loc.t(0)).toBe("OK")
    expect(loc.t(2)).toBe("Save")
  })

  it("preload fills cache without changing dict", async () => {
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async (l) => (l === "en" ? COMMON_EN : COMMON_ID),
    })
    await loc.preload("id")
    expect(loc.t(0)).toBe("OK")
  })

  it("setLocale switches array and updates translations and locale signal", async () => {
    let resolveLoad: (v: readonly string[]) => void = () => {
      throw new Error("resolveLoad not assigned")
    }
    const p = new Promise<readonly string[]>((r) => {
      resolveLoad = r
    })
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async () => p,
    })

    const set = loc.setLocale("id")
    // locale signal should update immediately
    expect(loc.locale()).toBe("id")

    // resolve loader
    resolveLoad(COMMON_ID)
    await set

    expect(loc.t(0)).toBe("Oke")
    expect(loc.t(1)).toBe("Batal")
  })

  it("dictRef returns current array reference and updates after setLocale", async () => {
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async (l) => (l === "en" ? COMMON_EN : COMMON_ID),
    })
    const before = loc.dictRef()
    expect(before).toBe(COMMON_EN)
    await loc.setLocale("id")
    const after = loc.dictRef()
    expect(after).toBe(COMMON_ID)
  })

  it("invalid id yields undefined (fail-fast by design)", () => {
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async () => COMMON_EN,
    })
    expect(loc.t(99)).toBeUndefined()
  })

  it("preload is single-flight (parallel calls share the same promise)", async () => {
    let calls = 0
    const loader = async () => {
      calls++
      return new Promise<readonly string[]>((res) => setTimeout(() => res(COMMON_ID), 10))
    }
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: loader,
    })
    const p1 = loc.preload("id")
    const p2 = loc.preload("id")
    await Promise.all([p1, p2])
    expect(calls).toBe(1)
  })

  it("cache does not poison on loader rejection", async () => {
    let attempts = 0
    const loader = async () => {
      attempts++
      if (attempts === 1) throw new Error("boom")
      return COMMON_ID
    }
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: loader,
    })

    // first attempt should reject
    let failed = false
    try {
      await loc.preload("id")
    } catch {
      failed = true
    }
    expect(failed).toBe(true)

    // second attempt should succeed (cache cleared on reject)
    await loc.preload("id")
    expect(loc.dictRef()).toBe(COMMON_EN) // preload shouldn't change current dict
  })

  it("dev hooks onLocaleChange and onError are invoked appropriately", async () => {
    const calls: string[] = []
    const loader = async (l: string) => {
      if (l === "bad") throw new Error("no")
      return l === "en" ? COMMON_EN : COMMON_ID
    }
    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: loader,
      dev: {
        onLocaleChange: (l) => calls.push(`change:${String(l)}`),
        onError: (_e, l) => calls.push(`error:${String(l)}`),
      },
    })

    // onLocaleChange should be called when setting a new locale
    await expect(loc.setLocale("id")).resolves.toBeDefined()
    expect(calls).toContain("change:id")

    // onError should be called when loader rejects
    calls.length = 0
    await expect(loc.setLocale("bad")).rejects.toBeTruthy()
    expect(calls).toContain("change:bad")
    expect(calls).toContain("error:bad")
  })
})
