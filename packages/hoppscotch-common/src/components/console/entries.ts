import type { ConsoleEntry } from "./Panel.vue"

export const renderConsoleEntries = (messages: ConsoleEntry[]) => {
  const output: ConsoleEntry[] = []
  const groupStack: ConsoleEntry[] = []

  const appendEntry = (entry: ConsoleEntry) => {
    const currentGroup = groupStack[groupStack.length - 1]

    if (currentGroup) {
      currentGroup.children?.push(entry)
      return
    }

    output.push(entry)
  }

  for (const [id, sourceEntry] of messages.entries()) {
    const entry = { ...sourceEntry, id }

    if (entry.type === "clear") {
      output.length = 0
      groupStack.length = 0
      continue
    }

    if (entry.type === "group") {
      const groupEntry: ConsoleEntry = {
        ...entry,
        children: [],
      }

      appendEntry(groupEntry)
      groupStack.push(groupEntry)
      continue
    }

    if (entry.type === "groupEnd") {
      groupStack.pop()
      continue
    }

    appendEntry(entry)
  }

  return output
}
