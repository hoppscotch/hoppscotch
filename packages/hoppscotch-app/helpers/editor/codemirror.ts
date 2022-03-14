import {
  keymap,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  placeholder,
} from "@codemirror/view"
import {
  Extension,
  EditorState,
  Compartment,
  EditorSelection,
} from "@codemirror/state"
import { Language, LanguageSupport } from "@codemirror/language"
import { defaultKeymap } from "@codemirror/commands"
import { Completion, autocompletion } from "@codemirror/autocomplete"
import { linter } from "@codemirror/lint"

import {
  watch,
  ref,
  Ref,
  onMounted,
  onBeforeUnmount,
} from "@nuxtjs/composition-api"

import { javascriptLanguage } from "@codemirror/lang-javascript"
import { xmlLanguage } from "@codemirror/lang-xml"
import { jsonLanguage } from "@codemirror/lang-json"
import { GQLLanguage } from "@hoppscotch/codemirror-lang-graphql"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { StreamLanguage } from "@codemirror/stream-parser"
import { html } from "@codemirror/legacy-modes/mode/xml"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { yaml } from "@codemirror/legacy-modes/mode/yaml"
import { isJSONContentType } from "../utils/contenttypes"
import { useStreamSubscriber } from "../utils/composables"
import { Completer } from "./completion"
import { LinterDefinition } from "./linting/linter"
import { basicSetup, baseTheme, baseHighlightStyle } from "./themes/baseTheme"
import { HoppEnvironmentPlugin } from "./extensions/HoppEnvironment"
// TODO: Migrate from legacy mode

type ExtendedEditorConfig = {
  mode: string
  placeholder: string
  readOnly: boolean
  lineWrapping: boolean
}

type CodeMirrorOptions = {
  extendedEditorConfig: Partial<ExtendedEditorConfig>
  linter: LinterDefinition | null
  completer: Completer | null

  // NOTE: This property is not reactive
  environmentHighlights: boolean
}

const hoppCompleterExt = (completer: Completer): Extension => {
  return autocompletion({
    override: [
      async (context) => {
        // Expensive operation! Disable on bigger files ?
        const text = context.state.doc.toJSON().join(context.state.lineBreak)

        const line = context.state.doc.lineAt(context.pos)
        const lineStart = line.from
        const lineNo = line.number - 1
        const ch = context.pos - lineStart

        // Only do trigger on type when typing a word token, else stop (unless explicit)
        if (!context.matchBefore(/\w+/) && !context.explicit)
          return {
            from: context.pos,
            options: [],
          }

        const result = await completer(text, { line: lineNo, ch })

        // Use more completion features ?
        const completions =
          result?.completions.map<Completion>((comp) => ({
            label: comp.text,
            detail: comp.meta,
          })) ?? []

        return {
          from: context.state.wordAt(context.pos)?.from ?? context.pos,
          options: completions,
        }
      },
    ],
  })
}

const hoppLinterExt = (hoppLinter: LinterDefinition): Extension => {
  return linter(async (view) => {
    // Requires full document scan, hence expensive on big files, force disable on big files ?
    const linterResult = await hoppLinter(
      view.state.doc.toJSON().join(view.state.lineBreak)
    )

    return linterResult.map((result) => {
      const startPos =
        view.state.doc.line(result.from.line).from + result.from.ch - 1
      const endPos = view.state.doc.line(result.to.line).from + result.to.ch - 1

      return {
        from: startPos < 0 ? 0 : startPos,
        to: endPos > view.state.doc.length ? view.state.doc.length : endPos,
        message: result.message,
        severity: result.severity,
      }
    })
  })
}

const hoppLang = (
  language: Language,
  linter?: LinterDefinition | undefined,
  completer?: Completer | undefined
) => {
  const exts: Extension[] = []

  if (linter) exts.push(hoppLinterExt(linter))
  if (completer) exts.push(hoppCompleterExt(completer))

  return new LanguageSupport(language, exts)
}

const getLanguage = (langMime: string): Language | null => {
  if (isJSONContentType(langMime)) {
    return jsonLanguage
  } else if (langMime === "application/javascript") {
    return javascriptLanguage
  } else if (langMime === "graphql") {
    return GQLLanguage
  } else if (langMime === "application/xml") {
    return xmlLanguage
  } else if (langMime === "htmlmixed") {
    return StreamLanguage.define(html)
  } else if (langMime === "application/x-sh") {
    return StreamLanguage.define(shell)
  } else if (langMime === "text/x-yaml") {
    return StreamLanguage.define(yaml)
  }

  // None matched, so return null
  return null
}

const getEditorLanguage = (
  langMime: string,
  linter: LinterDefinition | undefined,
  completer: Completer | undefined
): Extension =>
  pipe(
    O.fromNullable(getLanguage(langMime)),
    O.map((lang) => hoppLang(lang, linter, completer)),
    O.getOrElseW(() => [])
  )

export function useCodemirror(
  el: Ref<any | null>,
  value: Ref<string>,
  options: CodeMirrorOptions
): { cursor: Ref<{ line: number; ch: number }> } {
  const { subscribeToStream } = useStreamSubscriber()

  const language = new Compartment()
  const lineWrapping = new Compartment()
  const placeholderConfig = new Compartment()

  const cachedCursor = ref({
    line: 0,
    ch: 0,
  })
  const cursor = ref({
    line: 0,
    ch: 0,
  })

  const cachedValue = ref(value.value)

  const view = ref<EditorView>()

  const environmentTooltip = options.environmentHighlights
    ? new HoppEnvironmentPlugin(subscribeToStream, view)
    : null

  const initView = (el: any) => {
    const extensions = [
      basicSetup,
      baseTheme,
      baseHighlightStyle,
      ViewPlugin.fromClass(
        class {
          update(update: ViewUpdate) {
            if (update.selectionSet) {
              const cursorPos = update.state.selection.main.head

              const line = update.state.doc.lineAt(cursorPos)

              cachedCursor.value = {
                line: line.number - 1,
                ch: cursorPos - line.from,
              }

              cursor.value = {
                line: cachedCursor.value.line,
                ch: cachedCursor.value.ch,
              }
            }
            if (update.docChanged) {
              // Expensive on big files ?
              cachedValue.value = update.state.doc
                .toJSON()
                .join(update.state.lineBreak)
              if (!options.extendedEditorConfig.readOnly)
                value.value = cachedValue.value
            }
          }
        }
      ),
      EditorState.changeFilter.of(() => !options.extendedEditorConfig.readOnly),
      placeholderConfig.of(
        placeholder(options.extendedEditorConfig.placeholder ?? "")
      ),
      language.of(
        getEditorLanguage(
          options.extendedEditorConfig.mode ?? "",
          options.linter ?? undefined,
          options.completer ?? undefined
        )
      ),
      lineWrapping.of(
        options.extendedEditorConfig.lineWrapping
          ? [EditorView.lineWrapping]
          : []
      ),
      keymap.of(defaultKeymap),
    ]

    if (environmentTooltip) extensions.push(environmentTooltip.extension)

    view.value = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: value.value,
        extensions,
      }),
    })
  }

  onMounted(() => {
    if (el.value) {
      if (!view.value) initView(el.value)
    }
  })

  watch(el, () => {
    if (el.value) {
      if (view.value) view.value.destroy()
      initView(el.value)
    } else {
      view.value?.destroy()
      view.value = undefined
    }
  })

  onBeforeUnmount(() => {
    view.value?.destroy()
  })

  watch(value, (newVal) => {
    if (cachedValue.value !== newVal) {
      view.value?.dispatch({
        filter: false,
        changes: {
          from: 0,
          to: view.value.state.doc.length,
          insert: newVal,
        },
      })
    }
    cachedValue.value = newVal
  })

  watch(
    () => [
      options.extendedEditorConfig.mode,
      options.linter,
      options.completer,
    ],
    () => {
      view.value?.dispatch({
        effects: language.reconfigure(
          getEditorLanguage(
            (options.extendedEditorConfig.mode as any) ?? "",
            options.linter ?? undefined,
            options.completer ?? undefined
          )
        ),
      })
    }
  )

  watch(
    () => options.extendedEditorConfig.lineWrapping,
    (newMode) => {
      view.value?.dispatch({
        effects: lineWrapping.reconfigure(
          newMode ? [EditorView.lineWrapping] : []
        ),
      })
    }
  )

  watch(
    () => options.extendedEditorConfig.placeholder,
    (newValue) => {
      view.value?.dispatch({
        effects: placeholderConfig.reconfigure(placeholder(newValue ?? "")),
      })
    }
  )

  watch(cursor, (newPos) => {
    if (view.value) {
      if (
        cachedCursor.value.line !== newPos.line ||
        cachedCursor.value.ch !== newPos.ch
      ) {
        const line = view.value.state.doc.line(newPos.line + 1)
        const selUpdate = EditorSelection.cursor(line.from + newPos.ch - 1)

        view.value?.focus()

        view.value.dispatch({
          scrollIntoView: true,
          selection: selUpdate,
          effects: EditorView.scrollTo.of(selUpdate),
        })
      }
    }
  })

  return {
    cursor,
  }
}
