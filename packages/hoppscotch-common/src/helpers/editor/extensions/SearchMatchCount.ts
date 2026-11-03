import { EditorView, Panel } from "@codemirror/view"
import {
  getSearchQuery,
  setSearchQuery,
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  closeSearchPanel,
  selectMatches,
} from "@codemirror/search"

/**
 * Computes the total match count and current match index for a search query.
 *
 * Uses SearchQuery.getCursor to iterate all matches in the document.
 * The current match index is determined by finding the match whose range
 * contains or starts at the editor's main selection head.
 *
 * @returns `{ total, current }` where current is 1-indexed (0 if no match is active)
 */
function computeMatchCounts(view: EditorView): {
  total: number
  current: number
} {
  const state = view.state
  const query = getSearchQuery(state)

  if (!query.valid) {
    return { total: 0, current: 0 }
  }

  const cursor = query.getCursor(state)
  const mainHead = state.selection.main.head
  let total = 0
  let current = 0

  let result = cursor.next()
  while (!result.done) {
    total++
    const { from, to } = result.value
    // The active match is the one whose range contains the cursor head
    if (mainHead >= from && mainHead <= to) {
      current = total
    }
    result = cursor.next()
  }

  return { total, current }
}

/**
 * Creates a custom search panel that includes a live "X of Y" match count.
 *
 * This mirrors the default CodeMirror SearchPanel structure but appends a
 * `<span class="cm-search-match-count">` element that updates on every
 * editor state change.
 */
export function createSearchPanelWithCounts(view: EditorView): Panel {
  let query = getSearchQuery(view.state)

  const searchField = document.createElement("input")
  searchField.className = "cm-textfield"
  searchField.name = "search"
  searchField.setAttribute("form", "")
  searchField.setAttribute("main-field", "true")
  searchField.setAttribute("aria-label", "Find")
  searchField.placeholder = "Find"
  searchField.value = query.search

  const replaceField = document.createElement("input")
  replaceField.className = "cm-textfield"
  replaceField.name = "replace"
  replaceField.setAttribute("form", "")
  replaceField.setAttribute("aria-label", "Replace")
  replaceField.placeholder = "Replace"
  replaceField.value = query.replace

  const caseField = document.createElement("input")
  caseField.type = "checkbox"
  caseField.name = "case"
  caseField.setAttribute("form", "")
  caseField.checked = query.caseSensitive

  const reField = document.createElement("input")
  reField.type = "checkbox"
  reField.name = "re"
  reField.setAttribute("form", "")
  reField.checked = query.regexp

  const wordField = document.createElement("input")
  wordField.type = "checkbox"
  wordField.name = "word"
  wordField.setAttribute("form", "")
  wordField.checked = query.wholeWord

  // Match count indicator
  const matchCountEl = document.createElement("span")
  matchCountEl.className = "cm-search-match-count"
  matchCountEl.setAttribute("aria-live", "polite")

  function updateMatchCount() {
    const { total, current } = computeMatchCounts(view)
    if (!query.valid || query.search.length === 0) {
      matchCountEl.textContent = ""
    } else if (total === 0) {
      matchCountEl.textContent = "No results"
    } else if (current > 0) {
      matchCountEl.textContent = `${current} of ${total}`
    } else {
      matchCountEl.textContent = `${total} results`
    }
  }

  function commit() {
    const newQuery = new SearchQuery({
      search: searchField.value,
      caseSensitive: caseField.checked,
      regexp: reField.checked,
      wholeWord: wordField.checked,
      replace: replaceField.value,
    })
    if (!newQuery.eq(query)) {
      query = newQuery
      view.dispatch({ effects: setSearchQuery.of(newQuery) })
    }
  }

  searchField.addEventListener("change", commit)
  searchField.addEventListener("keyup", commit)
  replaceField.addEventListener("change", commit)
  replaceField.addEventListener("keyup", commit)
  caseField.addEventListener("change", commit)
  reField.addEventListener("change", commit)
  wordField.addEventListener("change", commit)

  function createButton(
    name: string,
    onclick: () => void,
    label: string
  ): HTMLButtonElement {
    const btn = document.createElement("button")
    btn.className = "cm-button"
    btn.name = name
    btn.type = "button"
    btn.textContent = label
    btn.addEventListener("click", onclick)
    return btn
  }

  const closeBtn = document.createElement("button")
  closeBtn.name = "close"
  closeBtn.type = "button"
  closeBtn.setAttribute("aria-label", "close")
  closeBtn.textContent = "×"
  closeBtn.addEventListener("click", () => closeSearchPanel(view))

  // Build the panel DOM
  const dom = document.createElement("div")
  dom.className = "cm-search"
  dom.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.target === searchField) {
      e.preventDefault()
      ;(e.shiftKey ? findPrevious : findNext)(view)
    } else if (e.key === "Enter" && e.target === replaceField) {
      e.preventDefault()
      replaceNext(view)
    } else if (e.key === "Escape") {
      e.preventDefault()
      closeSearchPanel(view)
      view.focus()
    }
  })

  // Search row: input, match count, navigation buttons
  dom.append(
    searchField,
    matchCountEl,
    createButton("next", () => findNext(view), "next"),
    createButton("prev", () => findPrevious(view), "previous"),
    createButton("select", () => selectMatches(view), "all")
  )

  // Options
  const caseLabel = document.createElement("label")
  caseLabel.append(caseField, " match case")
  const reLabel = document.createElement("label")
  reLabel.append(reField, " regexp")
  const wordLabel = document.createElement("label")
  wordLabel.append(wordField, " by word")
  dom.append(caseLabel, reLabel, wordLabel)

  // Replace row (only for writable editors)
  if (!view.state.readOnly) {
    dom.append(
      document.createElement("br"),
      replaceField,
      createButton("replace", () => replaceNext(view), "replace"),
      createButton("replaceAll", () => replaceAll(view), "replace all")
    )
  }

  dom.append(closeBtn)

  // Initial count
  updateMatchCount()

  return {
    dom,
    mount() {
      searchField.select()
    },
    update(update) {
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(setSearchQuery) && !effect.value.eq(query)) {
            query = effect.value
            searchField.value = query.search
            replaceField.value = query.replace
            caseField.checked = query.caseSensitive
            reField.checked = query.regexp
            wordField.checked = query.wholeWord
          }
        }
      }
      // Update match count on any state change (query change, cursor move, doc edit)
      if (
        update.docChanged ||
        update.selectionSet ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(setSearchQuery))
        )
      ) {
        updateMatchCount()
      }
    },
    get top() {
      return true
    },
  }
}
