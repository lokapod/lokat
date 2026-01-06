export { emitAll } from "./emit"
export type {
  GenerateOptions,
  GenerateResult,
  InputLayout,
  LocaleCode,
  LocaleDict,
  Namespace,
  ValidationIssue,
} from "./types"
export { loadLayout, names } from "./util"
export { validateAndOrder } from "./validate"

import { emitAll } from "./emit"
import type { GenerateOptions, GenerateResult } from "./types"
import { loadLayout } from "./util"
import { validateAndOrder } from "./validate"

/**
 * Programmatic API: end-to-end generation.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const layout = await loadLayout(opts.inputDir, opts.locales)
  const res = validateAndOrder(layout, opts.refLocale)
  emitAll(opts.outputDir, layout, res, opts.locales)
  return res
}
