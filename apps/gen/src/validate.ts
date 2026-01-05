import type {
  GenerateResult,
  InputLayout,
  LocaleCode,
  Namespace,
  ValidationIssue,
} from "./types.ts"

export function validateAndOrder(layout: InputLayout, refLocale: LocaleCode): GenerateResult {
  const issues: ValidationIssue[] = []
  const ref = layout.locales.get(refLocale)
  if (!ref) throw new Error(`Reference locale '${refLocale}' not found in input`)
  const namespaces = [...ref.keys()].sort()
  const orderByNs = new Map<Namespace, string[]>()

  for (const ns of namespaces) {
    const refDict = ref.get(ns)
    const refKeys = refDict ? Object.keys(refDict) : []
    orderByNs.set(ns, refKeys)

    for (const [loc, nsMap] of layout.locales) {
      const d = nsMap.get(ns)
      if (!d) {
        issues.push({ locale: loc, namespace: ns, message: `Missing namespace` })
        continue
      }
      const keys = Object.keys(d)
      if (keys.length !== refKeys.length) {
        issues.push({
          locale: loc,
          namespace: ns,
          message: `Key count mismatch: got ${keys.length}, expected ${refKeys.length}`,
        })
      }
      for (let i = 0; i < refKeys.length; i++) {
        if (keys[i] !== refKeys[i]) {
          issues.push({
            locale: loc,
            namespace: ns,
            message: `Order mismatch at index ${i}: '${keys[i]}' vs '${refKeys[i]}'`,
          })
          break
        }
      }
    }
  }

  return { namespaces, orderByNs, issues }
}
