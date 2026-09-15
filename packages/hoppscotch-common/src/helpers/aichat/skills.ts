/**
 * Named prompts the assistant offers under "/" in the composer.
 *
 * A skill is just a well-written instruction with a name — picking one drops
 * its prompt into the input rather than sending it, so the user can add a
 * detail or trim it before committing. Nothing here talks to the model
 * directly; the prompt takes the ordinary path a typed message would.
 */
export type ChatSkill = {
  /** What the user types after "/". Lowercase, digits and dashes. */
  slug: string
  title: string
  description: string
  prompt: string
  /** False for the set shipped with the app, true for an admin's own. */
  custom: boolean
}

/**
 * The set shipped with the app.
 *
 * Written against the tool contract the assistant already has — each one is a
 * task it can genuinely carry out, not a wish. An admin skill sharing a slug
 * replaces the entry here, so these are a starting point rather than a fixed
 * list.
 */
export const BUILT_IN_SKILLS: ChatSkill[] = [
  {
    slug: "debug-request",
    title: "Debug this request",
    description: "Work out why the current request is failing",
    prompt:
      "This request isn't working. Check the URL, method, authentication, " +
      "headers and body against the response, tell me the most likely cause, " +
      "and make the change you're confident about.",
    custom: false,
  },
  {
    slug: "write-tests",
    title: "Write tests",
    description: "Add tests covering the current response",
    prompt:
      "Write tests for this request that cover the status code, the response " +
      "shape and the values that matter, then save them to the test script.",
    custom: false,
  },
  {
    slug: "explain",
    title: "Explain this request",
    description: "Describe what the request does and what came back",
    prompt:
      "Explain what this request does, what the response means, and anything " +
      "in it that looks unusual. Keep it short.",
    custom: false,
  },
  {
    slug: "add-auth",
    title: "Add authentication",
    description: "Set up auth on this request",
    prompt:
      "Set up authentication for this request. Ask me which scheme and where " +
      "the credential lives if it isn't obvious, and put any secret in a " +
      "secret environment variable rather than inline.",
    custom: false,
  },
  {
    slug: "document",
    title: "Document this",
    description: "Write a description for the request or collection",
    prompt:
      "Write a clear description for this request — what it's for, what it " +
      "takes, what it returns, and anything a caller would trip over — and " +
      "save it to the request's description.",
    custom: false,
  },
  {
    slug: "run-and-check",
    title: "Run and check",
    description: "Send the request and say whether the response looks right",
    prompt:
      "Run this request and tell me whether the response looks correct. Call " +
      "out anything unexpected in the status, the headers or the body.",
    custom: false,
  },
]

/**
 * The built-in set with an admin's own laid over it.
 *
 * A custom skill sharing a slug REPLACES the built-in rather than sitting
 * beside it: two entries answering to one "/" name would make the menu a coin
 * flip, and overriding is the point — a team can reword a built-in to match how
 * they work instead of only adding to them.
 */
export const mergeSkills = (
  custom: Omit<ChatSkill, "custom">[]
): ChatSkill[] => {
  const overridden = new Set(custom.map((skill) => skill.slug))
  return [
    ...BUILT_IN_SKILLS.filter((skill) => !overridden.has(skill.slug)),
    ...custom.map((skill) => ({ ...skill, custom: true })),
  ]
}

/**
 * The skills matching what has been typed after "/".
 *
 * Matches the slug and the title, because a user reaching for "/tests" and one
 * reaching for "/write" are both looking for the same thing. Ranked so a slug
 * that starts with the query beats one that merely contains it — an exact
 * prefix is almost always what was meant.
 */
export const filterSkills = (skills: ChatSkill[], query: string) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return skills

  const score = (skill: ChatSkill) => {
    const slug = skill.slug.toLowerCase()
    const title = skill.title.toLowerCase()
    if (slug === needle) return 0
    if (slug.startsWith(needle)) return 1
    if (title.startsWith(needle)) return 2
    if (slug.includes(needle)) return 3
    if (title.includes(needle)) return 4
    return skill.description.toLowerCase().includes(needle) ? 5 : -1
  }

  return skills
    .map((skill) => ({ skill, rank: score(skill) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(({ skill }) => skill)
}

/**
 * The query when the composer holds a skill invocation, or null.
 *
 * Only a "/" at the very start counts: mid-message slashes belong to URLs and
 * paths, which this chat is full of.
 */
export const skillQueryIn = (input: string): string | null => {
  if (!input.startsWith("/")) return null
  const rest = input.slice(1)
  // A space means they have moved on to writing a message, not choosing.
  return /\s/.test(rest) ? null : rest
}
