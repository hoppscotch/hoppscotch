import { watch, Ref } from "@nuxtjs/composition-api"
import { Compartment } from "@codemirror/state"
import { hoverTooltip } from "@codemirror/tooltip"
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
} from "@codemirror/view"
import { StreamSubscriberFunc } from "~/helpers/utils/composables"
import {
  AggregateEnvironment,
  aggregateEnvs$,
  getAggregateEnvs,
} from "~/newstore/environments"

const HOPP_ENVIRONMENT_REGEX = /(<<\w+>>)/g

const HOPP_ENV_HIGHLIGHT =
  "cursor-help transition rounded px-1 focus:outline-none mx-0.5"
const HOPP_ENV_HIGHLIGHT_FOUND =
  "bg-accentDark text-accentContrast hover:bg-accent"
const HOPP_ENV_HIGHLIGHT_NOT_FOUND = "bg-red-400 text-red-50 hover:bg-red-600"

const cursorTooltipField = (aggregateEnvs: AggregateEnvironment[]) =>
  hoverTooltip(
    (view, pos, side) => {
      const { from, to, text } = view.state.doc.lineAt(pos)

      // TODO: When Codemirror 6 allows this to work (not make the
      // popups appear half of the time) use this implementation
      // const wordSelection = view.state.wordAt(pos)
      // if (!wordSelection) return null
      // const word = view.state.doc.sliceString(
      //   wordSelection.from - 2,
      //   wordSelection.to + 2
      // )
      // if (!HOPP_ENVIRONMENT_REGEX.test(word)) return null

      // Tracking the start and the end of the words
      let start = pos
      let end = pos

      while (start > from && /\w/.test(text[start - from - 1])) start--
      while (end < to && /\w/.test(text[end - from])) end++

      if (
        (start === pos && side < 0) ||
        (end === pos && side > 0) ||
        !HOPP_ENVIRONMENT_REGEX.test(
          text.slice(start - from - 2, end - from + 2)
        )
      )
        return null

      const envName =
        aggregateEnvs.find(
          (env) => env.key === text.slice(start - from, end - from)
          // env.key === word.slice(wordSelection.from + 2, wordSelection.to - 2)
        )?.sourceEnv ?? "choose an environment"

      const envValue = (
        aggregateEnvs.find(
          (env) => env.key === text.slice(start - from, end - from)
          // env.key === word.slice(wordSelection.from + 2, wordSelection.to - 2)
        )?.value ?? "not found"
      ).replace(/"/g, "&quot;")

      const textContent = `${envName} <xmp>${envValue}</xmp>`

      return {
        pos: start,
        end: to,
        above: true,
        create() {
          const dom = document.createElement("span")
          dom.innerHTML = textContent
          dom.className = "tooltip-theme"
          return { dom }
        },
      }
    },
    // HACK: This is a hack to fix hover tooltip not coming half of the time
    // https://github.com/codemirror/tooltip/blob/765c463fc1d5afcc3ec93cee47d72606bed27e1d/src/tooltip.ts#L622
    // Still doesn't fix the not showing up some of the time issue, but this is atleast more consistent
    { hoverTime: 1 } as any
  )

function checkEnv(env: string, aggregateEnvs: AggregateEnvironment[]) {
  const className = aggregateEnvs.find(
    (k: { key: string }) => k.key === env.slice(2, -2)
  )
    ? HOPP_ENV_HIGHLIGHT_FOUND
    : HOPP_ENV_HIGHLIGHT_NOT_FOUND

  return Decoration.mark({
    class: `${HOPP_ENV_HIGHLIGHT} ${className}`,
  })
}

const getMatchDecorator = (aggregateEnvs: AggregateEnvironment[]) =>
  new MatchDecorator({
    regexp: HOPP_ENVIRONMENT_REGEX,
    decoration: (m) => checkEnv(m[0], aggregateEnvs),
  })

export const environmentHighlightStyle = (
  aggregateEnvs: AggregateEnvironment[]
) => {
  const decorator = getMatchDecorator(aggregateEnvs)

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

export class HoppEnvironmentPlugin {
  private compartment = new Compartment()

  private envs: AggregateEnvironment[] = []

  constructor(
    subscribeToStream: StreamSubscriberFunc,
    private editorView: Ref<EditorView | undefined>
  ) {
    this.envs = getAggregateEnvs()

    subscribeToStream(aggregateEnvs$, (envs) => {
      this.envs = envs

      this.editorView.value?.dispatch({
        effects: this.compartment.reconfigure([
          cursorTooltipField(this.envs),
          environmentHighlightStyle(this.envs),
        ]),
      })
    })
  }

  get extension() {
    return this.compartment.of([
      cursorTooltipField(this.envs),
      environmentHighlightStyle(this.envs),
    ])
  }
}

export class HoppReactiveEnvPlugin {
  private compartment = new Compartment()

  private envs: AggregateEnvironment[] = []

  constructor(
    envsRef: Ref<AggregateEnvironment[]>,
    private editorView: Ref<EditorView | undefined>
  ) {
    watch(
      envsRef,
      (envs) => {
        this.envs = envs

        this.editorView.value?.dispatch({
          effects: this.compartment.reconfigure([
            cursorTooltipField(this.envs),
            environmentHighlightStyle(this.envs),
          ]),
        })
      },
      { immediate: true }
    )
  }

  get extension() {
    return this.compartment.of([
      cursorTooltipField(this.envs),
      environmentHighlightStyle(this.envs),
    ])
  }
}
