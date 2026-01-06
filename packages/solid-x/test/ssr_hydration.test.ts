import { describe, expect, it } from "bun:test"
import { createSolidLokat } from "../src/index.ts"

const COMMON_EN = Object.freeze(["OK", "Cancel", "Save"] as const)
const COMMON_ID = Object.freeze(["Oke", "Batal", "Simpan"] as const)

describe("SSR hydration flow (initialDict) for solid-x", () => {
  it("uses initialDict during hydration and switches to loaded array on setLocale", async () => {
    let resolveLoad: (d: readonly string[]) => void = () => {
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

    // initial array is available immediately
    expect(loc.t(0)).toBe("OK")

    const set = loc.setLocale("id")
    // locale signal updates synchronously on setLocale
    expect(loc.locale()).toBe("id")

    // resolve loader and await completion
    resolveLoad(COMMON_ID)
    await set

    // after resolution, t() reflects new array
    expect(loc.t(0)).toBe("Oke")
  })
})
