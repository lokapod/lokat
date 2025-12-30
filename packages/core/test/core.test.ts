import { describe, expect, it } from "bun:test"
import { createLokat } from "../src/index"

describe("@lokat/core createLokat", () => {
  it("loads and caches per locale (single fetch call)", async () => {
    let calls = 0
    const dictEN = { "home.title": "Welcome" } as const

    const i18n = createLokat({
      resolveLocaleUrl: (l) => `/locales/${l}.json`,
      fetcher: async (input: string) => {
        calls++
        expect(input).toBe("/locales/en.json")
        return {
          async json() {
            return dictEN as Record<string, string>
          },
        }
      },
    })

    const a = await i18n.load("en")
    const b = await i18n.load("en")
    expect(a).toBe(b) // same promise result cached across awaits
    expect(calls).toBe(1) // fetched only once
    expect(a["home.title"]).toBe("Welcome")
  })

  it("separates cache by locale", async () => {
    const calls: string[] = []
    const i18n = createLokat({
      resolveLocaleUrl: (l) => `/locales/${l}.json`,
      fetcher: async (input: string) => {
        calls.push(input)
        const data: Record<string, string> = input.endsWith("en.json") ? { x: "EN" } : { x: "ID" }
        return {
          async json() {
            return data
          },
        }
      },
    })

    const en = await i18n.load("en")
    const id = await i18n.load("id")
    expect(en.x).toBe("EN")
    expect(id.x).toBe("ID")
    expect(calls).toEqual(["/locales/en.json", "/locales/id.json"])
  })

  it("createT returns O(1) lookup with key fallback", () => {
    const i18n = createLokat({
      resolveLocaleUrl: (l) => l,
      fetcher: async () => ({
        async json() {
          return {}
        },
      }),
    })

    const t = i18n.createT({ "a.b": "ok" })
    expect(t("a.b")).toBe("ok")
    expect(t("missing")).toBe("missing") // fallback to key
  })

  it("no shared global state across instances", async () => {
    const i18nA = createLokat({
      resolveLocaleUrl: (l) => `/A/${l}`,
      fetcher: async (input: string) => ({
        async json() {
          return { scope: `A:${input}` }
        },
      }),
    })
    const i18nB = createLokat({
      resolveLocaleUrl: (l) => `/B/${l}`,
      fetcher: async (input: string) => ({
        async json() {
          return { scope: `B:${input}` }
        },
      }),
    })

    const a = await i18nA.load("en")
    const b = await i18nB.load("en")
    expect(a.scope).toBe("A:/A/en")
    expect(b.scope).toBe("B:/B/en")
  })
})
