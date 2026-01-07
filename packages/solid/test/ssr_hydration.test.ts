import { describe, expect, it } from "bun:test"
import { createSolidLokat } from "../src/index"

type Dict = Record<string, string>

describe("SSR hydration flow (initialDict) with setLocale", () => {
  it("uses initialDict during hydration and switches to loaded dict on setLocale", async () => {
    const COMMON_EN: Dict = { hello: "Hello" }
    const COMMON_ID: Dict = { hello: "Halo" }

    let resolveLoad: (d: Dict) => void = () => {
      throw new Error("resolveLoad not assigned")
    }
    const p = new Promise<Dict>((r) => {
      resolveLoad = r
    })

    const loc = createSolidLokat({
      initialLocale: "en",
      initialDict: COMMON_EN,
      loadLocale: async () => p,
    })

    // initialDict is available immediately
    expect(loc.t("hello")).toBe("Hello")

    const set = loc.setLocale("id")
    // locale signal updates synchronously on setLocale
    expect(loc.locale()).toBe("id")

    // resolve loader and await completion
    resolveLoad(COMMON_ID)
    await set

    // after resolution, t() reflects new dict
    expect(loc.t("hello")).toBe("Halo")
  })
})
