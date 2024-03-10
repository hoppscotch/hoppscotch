import { Compartment } from "@codemirror/state"
import {
  Decoration,
  MatchDecorator,
  ViewPlugin,
  hoverTooltip,
} from "@codemirror/view"
import IconVariable from "~icons/lucide/variable?raw"
import { HOPP_PREDEFINED_VARIABLES } from "@hoppscotch/data"

const HOPP_PREDEFINED_VARIABLES_REGEX = /(<<\$[a-zA-Z0-9-_]+>>)/g

const HOPP_PREDEFINED_VARIABLE_HIGHLIGHT =
  "cursor-help transition rounded px-1 focus:outline-none mx-0.5 predefined-variable-highlight"
const HOPP_PREDEFINED_VARIABLE_HIGHLIGHT_FOUND = "predefined-variable-found"
const HOPP_PREDEFINED_VARIABLE_HIGHLIGHT_NOT_FOUND =
  "predefined-variable-not-found"

const getMatchDecorator = () => {
  return new MatchDecorator({
    regexp: HOPP_PREDEFINED_VARIABLES_REGEX,
    decoration: (m) => checkPredefinedVariable(m[0]),
  })
}

const cursorTooltipField = () =>
  hoverTooltip(
    (view, pos, side) => {
      const { from, to, text } = view.state.doc.lineAt(pos)

      // TODO: When Codemirror 6 allows this to work (not make the
      // popups appear half of the time) use this implementation
      // const wordSelection = view.state.wordAt(pos)
      // if (!wordSelection) return null
      // const word = view.state.doc.sliceString(
      //   wordSelection.from - 3,
      //   wordSelection.to + 2
      // )
      // if (!HOPP_PREDEFINED_VARIABLES_REGEX.test(word)) return null

      // Tracking the start and the end of the words
      let start = pos
      let end = pos

      while (start > from && /[a-zA-Z0-9-_]+/.test(text[start - from - 1]))
        start--
      while (end < to && /[a-zA-Z0-9-_]+/.test(text[end - from])) end++

      if (
        (start === pos && side < 0) ||
        (end === pos && side > 0) ||
        !HOPP_PREDEFINED_VARIABLES_REGEX.test(
          text.slice(start - from - 3, end - from + 2)
        )
      ) {
        return null
      }

      const variableName = text.slice(start - from - 1, end - from)

      const variable = HOPP_PREDEFINED_VARIABLES.find(
        (VARIABLE) => VARIABLE.name === variableName
      )
      const variableValue = variable?.value() ?? "Empty"

      const variableIcon = `<span class="inline-flex items-center justify-center my-1">${IconVariable}</span>`

      return {
        pos: start,
        end: to,
        above: true,
        arrow: true,
        create() {
          const dom = document.createElement("span")
          const tooltipContainer = document.createElement("span")
          const kbd = document.createElement("kbd")
          const icon = document.createElement("span")
          icon.innerHTML = variableIcon
          icon.className = "mr-2"
          kbd.textContent = variableValue
          tooltipContainer.appendChild(icon)
          tooltipContainer.appendChild(
            document.createTextNode(`${variableName} `)
          )
          tooltipContainer.appendChild(kbd)
          tooltipContainer.className = "tippy-content"
          dom.className = "tippy-box"
          dom.dataset.theme = "tooltip"
          dom.appendChild(tooltipContainer)
          return { dom }
        },
      }
    },
    // HACK: This is a hack to fix hover tooltip not coming half of the time
    // https://github.com/codemirror/tooltip/blob/765c463fc1d5afcc3ec93cee47d72606bed27e1d/src/tooltip.ts#L622
    // Still doesn't fix the not showing up some of the time issue, but this is atleast more consistent
    { hoverTime: 1 } as any
  )

const checkPredefinedVariable = (variable: string) => {
  const className = HOPP_PREDEFINED_VARIABLES.find((VARIABLE) => {
    const userInputVariableName = variable.slice(2, -2)
    return VARIABLE.name === userInputVariableName
  })
    ? HOPP_PREDEFINED_VARIABLE_HIGHLIGHT_FOUND
    : HOPP_PREDEFINED_VARIABLE_HIGHLIGHT_NOT_FOUND

  return Decoration.mark({
    class: `${HOPP_PREDEFINED_VARIABLE_HIGHLIGHT} ${className}`,
  })
}

export const predefinedVariableHighlightStyle = () => {
  const decorator = getMatchDecorator()

  return ViewPlugin.define(
    (view) => ({
      decorations: decorator.createDeco(view),
      update(u) {
        this.decorations = decorator.updateDeco(u, this.decorations)
      },
    }),
    {
      decorations: (v) => v.decorations,
    }
  )
}

export class HoppPredefinedVariablesPlugin {
  private compartment = new Compartment()

  get extension() {
    return this.compartment.of([
      cursorTooltipField(),
      predefinedVariableHighlightStyle(),
    ])
  }
}
