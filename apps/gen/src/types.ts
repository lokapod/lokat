export type LocaleCode = string
export type Namespace = string

export type LocaleDict = Record<string, string>

export interface InputLayout {
  // locale -> namespace -> dict
  locales: Map<LocaleCode, Map<Namespace, LocaleDict>>
}

export interface GenerateOptions {
  inputDir: string
  outputDir: string
  locales: LocaleCode[]
  refLocale: LocaleCode
}

export interface ValidationIssue {
  locale: LocaleCode
  namespace: Namespace
  message: string
}

export interface GenerateResult {
  namespaces: Namespace[]
  orderByNs: Map<Namespace, string[]> // key order from ref locale
  issues: ValidationIssue[]
}
