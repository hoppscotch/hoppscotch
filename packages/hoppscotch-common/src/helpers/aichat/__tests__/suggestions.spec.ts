import { describe, expect, test } from "vitest"
import { getFollowUpSuggestions } from "../suggestions"

const K = (name: string) => `ai_experiments.chat.${name}`

describe("getFollowUpSuggestions", () => {
  test("prose-only turn falls back to generic starters", () => {
    expect(getFollowUpSuggestions([])).toEqual([
      K("suggestion_explain"),
      K("suggestion_add_header"),
      K("suggestion_run"),
    ])
  })

  test("after a run, suggests tests and explaining the response", () => {
    const out = getFollowUpSuggestions(["run_request"])
    expect(out).toContain(K("suggestion_write_tests"))
    expect(out).toContain(K("suggestion_explain_response"))
    expect(out).not.toContain(K("suggestion_run"))
  })

  test("a run that already wrote tests does not suggest writing tests", () => {
    const out = getFollowUpSuggestions(["set_test_script", "run_request"])
    expect(out).not.toContain(K("suggestion_write_tests"))
    expect(out).toContain(K("suggestion_explain_response"))
  })

  test("after edits without a run, suggests running and saving", () => {
    const out = getFollowUpSuggestions(["add_or_update_headers", "set_method"])
    expect(out).toEqual([K("suggestion_run"), K("suggestion_save")])
  })

  test("offline freeform edits count as edits via the sentinel", () => {
    const out = getFollowUpSuggestions(["request_edit"])
    expect(out).toEqual([K("suggestion_run"), K("suggestion_save")])
  })

  test("a turn that edited and saved does not suggest saving again", () => {
    const out = getFollowUpSuggestions(["set_url", "save_request"])
    expect(out).toEqual([K("suggestion_run")])
  })

  test("opening a request suggests running and explaining it", () => {
    const out = getFollowUpSuggestions(["open_request"])
    expect(out).toContain(K("suggestion_run"))
    expect(out).toContain(K("suggestion_explain"))
  })

  test("a collection build suggests running without asking to save it again", () => {
    expect(
      getFollowUpSuggestions(["add_or_update_collection_requests"])
    ).toEqual([K("suggestion_run")])
  })

  test("a collection run does not suggest writing tests already included in its build", () => {
    const out = getFollowUpSuggestions([
      "add_or_update_collection_requests",
      "run_collection",
    ])

    expect(out).not.toContain(K("suggestion_write_tests"))
    expect(out).toContain(K("suggestion_explain_response"))
  })

  test("environment-only turns nudge toward using the variables", () => {
    const out = getFollowUpSuggestions([
      "create_environment",
      "add_or_update_environment_variables",
    ])
    expect(out).toEqual([K("suggestion_use_env")])
  })

  test("caps at three unique suggestions", () => {
    const out = getFollowUpSuggestions([
      "set_url",
      "open_request",
      "create_environment",
    ])
    expect(out.length).toBeLessThanOrEqual(3)
    expect(new Set(out).size).toBe(out.length)
  })
})
