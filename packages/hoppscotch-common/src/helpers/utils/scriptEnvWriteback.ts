/**
 * Pure helpers for deciding what a post-request/test-script environment
 * writeback may send to the backend.
 *
 * The rule: a test script may only ever change a variable's per-user
 * `currentValue` (client-local); the shared `initialValue` that syncs to the
 * backend is never authored by a script — it is preserved for a pre-existing
 * NON-secret variable and cleared for one the script created (so a script's
 * runtime value, or a resolved secret, can't become a team-wide default). The
 * `initialValue` field is the environment editor's to change.
 */

/**
 * Keys that existed as NON-secret variables before this run. Secret keys are
 * excluded on purpose: a secret's `initialValue` must never surface as a
 * plaintext default, and a variable a script demotes from secret to non-secret
 * (unset + recreate) must be treated as freshly created.
 */
export const nonSecretKeysOf = (
  vars: readonly { key: string; secret?: boolean }[]
): Set<string> => new Set(vars.filter((v) => !v.secret).map((v) => v.key))

/**
 * The `initialValue` a NON-secret variable should carry on the env-sync wire
 * after a script run. Membership-only (never a keyed value lookup), so
 * duplicate keys each keep their OWN `initialValue` rather than collapsing to a
 * single value.
 *
 * - key existed pre-run as non-secret → keep the variable's own `initialValue`
 *   (a script only touched `currentValue`; the shared default is unchanged).
 * - key is new this run (created), or was secret and got demoted → `""`.
 */
export const frozenInitialValueForWire = (
  variable: { key: string; initialValue?: string },
  existingNonSecretKeys: ReadonlySet<string>
): string =>
  existingNonSecretKeys.has(variable.key) ? (variable.initialValue ?? "") : ""
