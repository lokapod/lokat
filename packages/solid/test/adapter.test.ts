import { describe, expect, it } from "bun:test"
import { createSolidLokat } from "../src/index"

type Dict = Record<string, string>

describe("@lokat/solid createSolidLokat", () => {
  it("hydrates instantly with initialDict (no flash)", async () => {
    const initial: Dict = { "home.title": "Welcome" }
    let calls = 0
    const i18n = createSolidLokat({
      initialLocale: "en",
      initialDict: initial,
      loadLocale: async (l) => {
        calls++
        return { "home.title": `Loaded:${l}` }
      },
    })

    expect(i18n.t("home.title")).toBe("Welcome")
    expect(calls).toBe(0) // initialDict avoids immediate load
    await i18n.setLocale("en")
    expect(i18n.t("home.title")).toBe("Loaded:en")
    expect(calls).toBe(1)
  })

  it("preload fills cache without changing dict", async () => {
    const i18n = createSolidLokat({
      initialLocale: "en",
      initialDict: { x: "init" },
      loadLocale: async (l) => ({ x: `dict:${l}` }),
    })
    await i18n.preload("id")
    // still initial dict
    expect(i18n.t("x")).toBe("init")
    // after switch
    await i18n.setLocale("id")
    expect(i18n.t("x")).toBe("dict:id")
  })

  it("caches per-locale; disableCache forces reloads", async () => {
    let calls = 0
    const i18nCached = createSolidLokat({
      initialLocale: "en",
      loadLocale: async (l) => {
        calls++
        return { v: `cached:${l}` }
      },
    })

    await i18nCached.preload("en")
    await i18nCached.preload("en")
    expect(calls).toBe(1)
    await i18nCached.setLocale("en")
    expect(i18nCached.t("v")).toBe("cached:en")

    let calls2 = 0
    const i18nNoCache = createSolidLokat({
      initialLocale: "en",
      initialDict: { v: "init" },
      dev: { disableCache: true },
      loadLocale: async (l) => {
        calls2++
        return { v: `nocache:${l}` }
      },
    })
    await i18nNoCache.preload("en")
    await i18nNoCache.preload("en")
    expect(calls2).toBe(2)
    await i18nNoCache.setLocale("en")
    expect(i18nNoCache.t("v")).toBe("nocache:en")
  })

  it("invokes dev hooks onLocaleChange and onError", async () => {
    const events: Array<{ evt: string; locale: unknown }> = []
    const i18n = createSolidLokat({
      initialLocale: "en",
      dev: {
        onLocaleChange: (l) => events.push({ evt: "change", locale: l }),
        onError: (_e, l) => events.push({ evt: "error", locale: l }),
      },
      loadLocale: async (l) => {
        if (l === "bad") throw new Error("boom")
        return { ok: String(l) }
      },
    })

    await i18n.setLocale("id")
    expect(events[0]).toEqual({ evt: "change", locale: "id" })
    await expect(i18n.setLocale("bad")).rejects.toThrow("boom")
    // change event fires before error handler
    expect(events[1]).toEqual({ evt: "change", locale: "bad" })
    expect(events[2]).toEqual({ evt: "error", locale: "bad" })
  })

  it("supports opaque object locale with reference-based cache", async () => {
    const en = { lang: "en", region: "US" }
    let calls = 0
    const i18n = createSolidLokat<{ lang: string; region: string }>({
      initialLocale: en,
      loadLocale: async (l) => {
        calls++
        return { loc: `${l.lang}-${l.region}` }
      },
    })

    await i18n.preload(en)
    await i18n.preload(en)
    expect(calls).toBe(1)

    const en2 = { lang: "en", region: "US" } // different ref
    await i18n.preload(en2)
    expect(calls).toBe(2)

    await i18n.setLocale(en)
    expect(i18n.t("loc")).toBe("en-US")
  })
})
