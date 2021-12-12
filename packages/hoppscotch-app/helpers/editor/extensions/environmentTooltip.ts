import { Extension } from "@codemirror/state"
import { hoverTooltip } from "@codemirror/tooltip"
import { Decoration, MatchDecorator, ViewPlugin } from "@codemirror/view"
import {
  StreamSubscriberFunc,
  useReadonlyStream,
} from "~/helpers/utils/composables"
import { aggregateEnvs$ } from "~/newstore/environments"

const cursorTooltipField = (subscribeToStream: StreamSubscriberFunc) =>
  hoverTooltip((view, pos, side) => {
    const { from, to, text } = view.state.doc.lineAt(pos)
    let start = pos
    let end = pos

    while (start > from && /\w/.test(text[start - from - 1])) start--
    while (end < to && /\w/.test(text[end - from])) end++

    if (
      (start === pos && side < 0) ||
      (end === pos && side > 0) ||
      !/(<<\w+>>)/g.test(text.slice(start - from - 2, end - from + 2))
    )
      return null

    let textContent: string
    subscribeToStream(aggregateEnvs$, (envs) => {
      const envName = getEnvName(
        envs.find(
          (env: { key: string }) =>
            env.key === text.slice(start - from, end - from)
        )?.sourceEnv
      )
      const envValue = getEnvValue(
        envs.find(
          (env: { key: string }) =>
            env.key === text.slice(start - from, end - from)
        )?.value
      )
      textContent = `${envName} <kbd>${envValue}</kbd>`
    })

    return {
      pos: start,
      end,
      above: true,
      create() {
        const dom = document.createElement("span")
        dom.innerHTML = textContent
        dom.className = "tooltip-theme"
        return { dom }
      },
    }
  })

function getEnvName(name: any) {
  if (name) return name
  return "choose an environment"
}

function getEnvValue(value: string | undefined) {
  if (value) return value.replace(/"/g, "&quot;")
  // it does not filter special characters before adding them to HTML.
  return "not found"
}

function checkEnv(env: string) {
  const envHighlight =
    "cursor-help transition rounded px-1 focus:outline-none mx-0.5"
  const envFound = "bg-accentDark text-accentContrast hover:bg-accent"
  const envNotFound = "bg-red-400 text-red-50 hover:bg-red-600"
  const aggregateEnvs = useReadonlyStream(aggregateEnvs$, null)
  const className =
    aggregateEnvs.value?.find(
      (k: { key: string }) => k.key === env.slice(2, -2)
    )?.value === undefined
      ? envNotFound
      : envFound
  return Decoration.mark({
    class: `${envHighlight} ${className}`,
  })
}

const decorator = new MatchDecorator({
  regexp: /(<<\w+>>)/g,
  decoration: (m) => checkEnv(m[0]),
})

export const environmentHighlightStyle = ViewPlugin.define(
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

export const environmentTooltip: (
  subscribeToStream: StreamSubscriberFunc
) => Extension = (subscribeToStream: StreamSubscriberFunc) => {
  return [cursorTooltipField(subscribeToStream), environmentHighlightStyle]
}
