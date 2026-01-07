import { describe, expect, it } from "bun:test"
import { createLokat } from "../src/index"

describe("core cache poisoning protection", () => {
  it("clears failed load from cache so subsequent loads can retry", async () => {
    let attempts = 0
    const fetcher = async (_: string) => {
      return {
        json: async () => {
          attempts++
          if (attempts === 1) throw new Error("boom")
          return { a: "A" }
        },
      }
    }

    const lok = createLokat({
      resolveLocaleUrl: () => "unused",
      fetcher,
    })

    // first attempt fails
    await expect(lok.load("en")).rejects.toThrow("boom")

    // second attempt should succeed (cache cleared on reject)
    const dict = await lok.load("en")
    expect(dict.a).toBe("A")
    expect(attempts).toBe(2)
  })
})
