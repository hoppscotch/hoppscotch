import { Environment } from "@hoppscotch/data"
import { TestResult } from "@hoppscotch/js-sandbox"

/**
 * Strips injected data-file iteration variables back out of a post-script env
 * so a data-driven run stays ephemeral on writeback, restoring any selected
 * variable a dataset column shadowed.
 *
 * The initial scope is walked in its original order because
 * `updateEnvsAfterTestScript` persists `selected` wholesale — rebuilding in a
 * different order would reshuffle the user's environment. Lookups are
 * occurrence-paired rather than key-flat: the env editor allows duplicate
 * keys and sandbox writes mutate the first matching occurrence. Script-added
 * keys are appended; `global` is left alone (iteration values are never
 * injected into it).
 */
export const stripIterationVarsFromEnvs = (
  envs: TestResult["envs"],
  iterationVarKeys: Set<string>,
  initialSelected: Environment["variables"]
): TestResult["envs"] => {
  if (iterationVarKeys.size === 0) return envs

  // key → queue of final entries, consumed one per initial occurrence.
  const finalByKey = new Map<string, TestResult["envs"]["selected"]>()
  for (const env of envs.selected) {
    const queue = finalByKey.get(env.key)
    if (queue) queue.push(env)
    else finalByKey.set(env.key, [env])
  }

  const initialKeys = new Set(initialSelected.map(({ key }) => key))

  const rebuilt: TestResult["envs"]["selected"] = []
  for (const initialVar of initialSelected) {
    if (iterationVarKeys.has(initialVar.key)) {
      rebuilt.push(initialVar)
      continue
    }

    // No final occurrence left → a script deleted this row.
    const final = finalByKey.get(initialVar.key)?.shift()
    if (final) rebuilt.push(final)
  }

  return {
    global: envs.global,
    selected: [
      ...rebuilt,
      ...envs.selected.filter(
        ({ key }) => !initialKeys.has(key) && !iterationVarKeys.has(key)
      ),
    ],
  }
}
