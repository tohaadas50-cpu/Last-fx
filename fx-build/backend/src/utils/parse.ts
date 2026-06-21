/**
 * Shared JSON parsing utility.
 * Extracts the first {...} block from text then parses it,
 * falling back to a full JSON.parse. Returns null on failure.
 *
 * Returns `any` to preserve compatibility with the callers that
 * perform runtime-narrowed property access (e.g. p?.summary, p?.title).
 * Proper generic typing is a Phase 3 / Phase 4 concern.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParseJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return JSON.parse(text)
  } catch {
    return null
  }
}
