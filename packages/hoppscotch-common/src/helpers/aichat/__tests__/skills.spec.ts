import { describe, expect, test } from "vitest"
import {
  BUILT_IN_SKILLS,
  filterSkills,
  mergeSkills,
  skillQueryIn,
} from "../skills"

const custom = (slug: string, over: Record<string, string> = {}) => ({
  slug,
  title: `Custom ${slug}`,
  description: `does ${slug}`,
  prompt: `do ${slug}`,
  ...over,
})

describe("the built-in set", () => {
  test("every slug is unique", () => {
    const slugs = BUILT_IN_SKILLS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test("every slug is typeable after a slash", () => {
    // The same rule the backend enforces on admin slugs.
    for (const skill of BUILT_IN_SKILLS) {
      expect(skill.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  test("every one carries a prompt that says something", () => {
    for (const skill of BUILT_IN_SKILLS) {
      expect(skill.title.trim()).not.toBe("")
      expect(skill.description.trim()).not.toBe("")
      expect(skill.prompt.trim().length).toBeGreaterThan(20)
    }
  })
})

describe("merging an admin's skills over the built-ins", () => {
  test("adds one with a new slug", () => {
    const merged = mergeSkills([custom("smoke-test")])

    expect(merged).toHaveLength(BUILT_IN_SKILLS.length + 1)
    expect(merged.at(-1)).toMatchObject({ slug: "smoke-test", custom: true })
  })

  test("replaces a built-in rather than sitting beside it", () => {
    // Two entries under one "/" name would make the menu a coin flip.
    const merged = mergeSkills([custom("explain", { title: "Our explain" })])

    const matches = merged.filter((s) => s.slug === "explain")
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ title: "Our explain", custom: true })
  })

  test("keeps one entry per slug when a record repeats", () => {
    const merged = mergeSkills([
      custom("smoke-test", { title: "First" }),
      custom("explain", { title: "Our explain" }),
      custom("smoke-test", { title: "Second" }),
      custom("explain", { title: "Again" }),
    ])

    const slugs = merged.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(merged.find((s) => s.slug === "smoke-test")?.title).toBe("First")
    expect(merged.find((s) => s.slug === "explain")?.title).toBe("Our explain")
  })

  test("leaves the built-ins alone when there are none", () => {
    expect(mergeSkills([])).toEqual(BUILT_IN_SKILLS)
  })

  test("marks provenance, so the dashboard can say which is which", () => {
    const merged = mergeSkills([custom("smoke-test")])

    expect(merged.filter((s) => s.custom)).toHaveLength(1)
    expect(merged.filter((s) => !s.custom)).toHaveLength(BUILT_IN_SKILLS.length)
  })
})

describe("filtering as the user types", () => {
  const skills = mergeSkills([])

  test("an empty query offers everything", () => {
    expect(filterSkills(skills, "")).toHaveLength(skills.length)
  })

  test("an exact slug wins over one that merely contains it", () => {
    const ranked = filterSkills(
      mergeSkills([custom("run"), custom("dry-run")]),
      "run"
    )
    expect(ranked[0].slug).toBe("run")
  })

  test("a prefix beats a substring", () => {
    const ranked = filterSkills(skills, "doc")
    expect(ranked[0].slug).toBe("document")
  })

  test("finds a skill by its title, not just its slug", () => {
    // "/tests" and "/write" should both reach the same skill.
    expect(filterSkills(skills, "tests").map((s) => s.slug)).toContain(
      "write-tests"
    )
    expect(filterSkills(skills, "write").map((s) => s.slug)).toContain(
      "write-tests"
    )
  })

  test("falls back to the description", () => {
    expect(filterSkills(skills, "failing").map((s) => s.slug)).toContain(
      "debug-request"
    )
  })

  test("offers nothing rather than everything when nothing matches", () => {
    expect(filterSkills(skills, "zzzznope")).toEqual([])
  })

  test("ignores case", () => {
    expect(filterSkills(skills, "DEBUG").map((s) => s.slug)).toContain(
      "debug-request"
    )
  })
})

describe("recognising a skill invocation", () => {
  test("a bare slash offers the whole menu", () => {
    expect(skillQueryIn("/")).toBe("")
  })

  test("carries what has been typed so far", () => {
    expect(skillQueryIn("/deb")).toBe("deb")
  })

  test("ignores a slash that is not at the start", () => {
    // This chat is full of URLs and paths.
    expect(skillQueryIn("what does /users/:id return")).toBeNull()
    expect(skillQueryIn("GET /api/v1/users")).toBeNull()
    // No spaces at all, so only the leading-slash rule can reject these — a
    // pasted URL is the case a "contains a slash" check would get wrong.
    expect(skillQueryIn("api.example.com/users")).toBeNull()
    expect(skillQueryIn("GET/users")).toBeNull()
  })

  test("stops once the user starts writing a message", () => {
    expect(skillQueryIn("/debug the login call")).toBeNull()
  })

  test("is null for ordinary text", () => {
    expect(skillQueryIn("explain this")).toBeNull()
    expect(skillQueryIn("")).toBeNull()
  })
})
