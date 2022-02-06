import { Compartment } from "@codemirror/state"
import { hoverTooltip } from "@codemirror/tooltip"
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
} from "@codemirror/view"
import { Ref } from "@nuxtjs/composition-api"
import { parseTemplateString } from "~/helpers/templating"
import { StreamSubscriberFunc } from "~/helpers/utils/composables"
import {
  AggregateEnvironment,
  aggregateEnvs$,
  getAggregateEnvs,
} from "~/newstore/environments"

const HOPP_ENVIRONMENT_REGEX = /(<<(?:[^<>]+|<<(?:[^<>]+|<<[^<>]*>>)*>>)*>>)/g

const HOPP_ENV_HIGHLIGHT =
  "cursor-help transition rounded px-1 focus:outline-none mx-0.5"
const HOPP_ENV_HIGHLIGHT_FOUND =
  "bg-accentDark text-accentContrast hover:bg-accent"
const HOPP_ENV_HIGHLIGHT_NOT_FOUND = "bg-red-400 text-red-50 hover:bg-red-600"

const cursorTooltipField = (aggregateEnvs: AggregateEnvironment[]) =>
  hoverTooltip((view, pos) => {
    const { text } = view.state.doc.lineAt(pos)

    const matches = Array.from(text.matchAll(HOPP_ENVIRONMENT_REGEX))
    const match = matches.find(
      (val) => val.index && pos >= val.index && pos <= val.index + val[0].length
    )

    if (!match?.index) return null

    // TODO: When Codemirror 6 allows this to work (not make the
    // popups appear half of the time) use this implementation
    // const wordSelection = view.state.wordAt(pos)
    // if (!wordSelection) return null
    // const word = view.state.doc.sliceString(
    //   wordSelection.from - 2,
    //   wordSelection.to + 2
    // )
    // if (!HOPP_ENVIRONMENT_REGEX.test(word)) return null

    const rawEnvVar = match[0].slice(2, -2)
    const envVar = parseTemplateString(rawEnvVar, aggregateEnvs)

    const envName =
      aggregateEnvs.find(
        (env) => env.key === envVar
        // env.key === word.slice(wordSelection.from + 2, wordSelection.to - 2)
      )?.sourceEnv ?? "choose an environment"

    const envValue = (
      aggregateEnvs.find(
        (env) => env.key === envVar
        // env.key === word.slice(wordSelection.from + 2, wordSelection.to - 2)
      )?.value ?? "not found"
    ).replace(/"/g, "&quot;")

    const textContent = `${envName} <kbd>${envValue}</kbd>`

    return {
      pos: match.index,
      end: match[0].length,
      above: true,
      create() {
        const dom = document.createElement("span")
        dom.innerHTML = textContent
        dom.className = "tooltip-theme"
        return { dom }
      },
    }
  })

function checkEnv(env: string, aggregateEnvs: AggregateEnvironment[]) {
  const rawEnvVar = env.slice(2, -2)
  const envVar = parseTemplateString(rawEnvVar, aggregateEnvs)

  const className = aggregateEnvs.find((k: { key: string }) => k.key === envVar)
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
