import CodeMirror from "codemirror"

import "codemirror-theme-github/theme/github.css"
import "codemirror/theme/base16-dark.css"
import "codemirror/theme/tomorrow-night-bright.css"

import "codemirror/lib/codemirror.css"
import "codemirror/addon/lint/lint.css"
import "codemirror/addon/dialog/dialog.css"
import "codemirror/addon/hint/show-hint.css"

import "codemirror/addon/fold/foldgutter.css"
import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/comment-fold"
import "codemirror/addon/fold/indent-fold"
import "codemirror/addon/display/autorefresh"
import "codemirror/addon/lint/lint"
import "codemirror/addon/hint/show-hint"
import "codemirror/addon/display/placeholder"
import "codemirror/addon/edit/closebrackets"
import "codemirror/addon/search/search"
import "codemirror/addon/search/searchcursor"
import "codemirror/addon/search/jump-to-line"
import "codemirror/addon/dialog/dialog"
import "codemirror/addon/selection/active-line"

import { watch, onMounted, ref, Ref, useContext } from "@nuxtjs/composition-api"

import {
  EditorState,
  Compartment,
  EditorSelection,
  TransactionSpec,
  Extension,
} from "@codemirror/state"
import { EditorView, keymap, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { basicSetup } from "@codemirror/basic-setup"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { Language, LanguageSupport } from "@codemirror/language"
import { linter } from "@codemirror/lint"
import { jsonLanguage } from "@codemirror/lang-json"
import { Completion, autocompletion } from "@codemirror/autocomplete"
import { onBeforeUnmount } from "@vue/runtime-dom"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { isJSONContentType } from "../utils/contenttypes"
import { Completer } from "./completion"
import { LinterDefinition } from "./linting/linter"
import baseTheme from "./themes/baseTheme"

type CodeMirrorOptions = {
  extendedEditorConfig: Omit<CodeMirror.EditorConfiguration, "value">
  linter: LinterDefinition | null
  completer: Completer | null
}

const DEFAULT_EDITOR_CONFIG: CodeMirror.EditorConfiguration = {
  autoRefresh: true,
  lineNumbers: true,
  foldGutter: true,
  autoCloseBrackets: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  extraKeys: {
    "Ctrl-Space": "autocomplete",
  },
  viewportMargin: Infinity,
  styleActiveLine: true,
}

/**
 * A Vue composable to mount and use Codemirror
 *
 * NOTE: Make sure to import all the necessary Codemirror modules,
 * as this function doesn't import any other than the core
 * @param el Reference to the dom node to attach to
 * @param value Reference to value to read/write to
 * @param options CodeMirror options to pass
 */
export function useCodemirror(
  el: Ref<any | null>,
  value: Ref<string>,
  options: CodeMirrorOptions
): { cm: Ref<CodeMirror.Position | null>; cursor: Ref<CodeMirror.Position> } {
  const { $colorMode } = useContext() as any

  const cm = ref<CodeMirror.Editor | null>(null)
  const cursor = ref<CodeMirror.Position>({ line: 0, ch: 0 })

  const updateEditorConfig = () => {
    Object.keys(options.extendedEditorConfig).forEach((key) => {
      // Only update options which need updating
      if (
        cm.value &&
        cm.value?.getOption(key as any) !==
          (options.extendedEditorConfig as any)[key]
      ) {
        cm.value?.setOption(
          key as any,
          (options.extendedEditorConfig as any)[key]
        )
      }
    })
  }

  const updateLinterConfig = () => {
    if (options.linter) {
      cm.value?.setOption("lint", options.linter)
    }
  }

  const updateCompleterConfig = () => {
    if (options.completer) {
      cm.value?.setOption("hintOptions", {
        completeSingle: false,
        hint: async (editor: CodeMirror.Editor) => {
          const pos = editor.getCursor()
          const text = editor.getValue()

          const token = editor.getTokenAt(pos)
          // It's not a word token, so, just increment to skip to next
          if (token.string.toUpperCase() === token.string.toLowerCase())
            token.start += 1

          const result = await options.completer!(text, pos)

          if (!result) return null

          return <CodeMirror.Hints>{
            from: { line: pos.line, ch: token.start },
            to: { line: pos.line, ch: token.end },
            list: result.completions
              .sort((a, b) => a.score - b.score)
              .map((x) => x.text),
          }
        },
      })
    }
  }

  const initialize = () => {
    if (!el.value) return

    cm.value = CodeMirror(el.value!, DEFAULT_EDITOR_CONFIG)

    cm.value.setValue(value.value)

    setTheme()
    updateEditorConfig()
    updateLinterConfig()
    updateCompleterConfig()

    cm.value.on("change", (instance) => {
      // External update propagation (via watchers) should be ignored
      if (instance.getValue() !== value.value) {
        value.value = instance.getValue()
      }
    })

    cm.value.on("cursorActivity", (instance) => {
      cursor.value = instance.getCursor()
    })
  }

  // Boot-up CodeMirror, set the value and listeners
  onMounted(() => {
    initialize()
  })

  // Reinitialize if the target ref updates
  watch(el, () => {
    if (cm.value) {
      const parent = cm.value.getWrapperElement()
      parent.remove()
      cm.value = null
    }
    initialize()
  })

  const setTheme = () => {
    if (cm.value) {
      cm.value?.setOption("theme", getThemeName($colorMode.value))
    }
  }

  const getThemeName = (mode: string) => {
    switch (mode) {
      case "system":
        return "default"
      case "light":
        return "github"
      case "dark":
        return "base16-dark"
      case "black":
        return "tomorrow-night-bright"
      default:
        return "default"
    }
  }

  // If the editor properties are reactive, watch for updates
  watch(() => options.extendedEditorConfig, updateEditorConfig, {
    immediate: true,
    deep: true,
  })
  watch(() => options.linter, updateLinterConfig, { immediate: true })
  watch(() => options.completer, updateCompleterConfig, { immediate: true })

  // Watch value updates
  watch(value, (newVal) => {
    // Check if we are mounted
    if (cm.value) {
      // Don't do anything on internal updates
      if (cm.value.getValue() !== newVal) {
        cm.value.setValue(newVal)
      }
    }
  })

  // Push cursor updates
  watch(cursor, (value) => {
    if (value !== cm.value?.getCursor()) {
      cm.value?.focus()
      cm.value?.setCursor(value)
    }
  })

  // Watch color mode updates and update theme
  watch(() => $colorMode.value, setTheme)

  return {
    cm,
    cursor,
  }
}

const hoppCompleterExt = (completer: Completer): Extension => {
  return autocompletion({
    override: [
      async (context) => {
        // Expensive operation! Disable on bigger files ?
        const text = context.state.doc.toJSON().join(context.state.lineBreak)

        const line = context.state.doc.lineAt(context.pos).from
        const ch = context.pos - line

        const result = await completer(text, { line, ch })

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
        view.state.doc.line(result.from.line + 1).from + result.from.ch
      const endPos = view.state.doc.line(result.to.line + 1).from + result.to.ch

      return {
        from: startPos,
        to: endPos,
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

export function useNewCodemirror(
  el: Ref<any | null>,
  value: Ref<string>,
  options: CodeMirrorOptions
): { cursor: Ref<{ line: number; ch: number }> } {
  const language = new Compartment()
  const lineWrapping = new Compartment()

  const cachedCursor = ref({
    line: 0,
    ch: 0,
  })
  const cursor = ref({
    line: 0,
    ch: 0,
  })
  const cachedValue = ref(value.value)

  const state = EditorState.create({
    doc: value.value,
    extensions: [
      basicSetup,
      baseTheme,
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
              console.log("doc change")
              cachedValue.value = update.state.doc
                .toJSON()
                .join(update.state.lineBreak)
              value.value = cachedValue.value
            }
          }
        }
      ),
      EditorState.changeFilter.of(() => !options.extendedEditorConfig.readOnly),
      language.of(
        getEditorLanguage(
          (options.extendedEditorConfig.mode as any) ?? "",
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
    ],
  })

  const view = ref<EditorView>()

  const dispatch = (t: TransactionSpec) =>
    view.value ? view.value.dispatch(t) : state.update(t)

  onMounted(() => {
    view.value = new EditorView({
      state,
      parent: el.value,
    })
  })

  onBeforeUnmount(() => {
    if (view.value) view.value.destroy()
  })

  watch(cursor, (newPos) => {
    if (
      cachedCursor.value.line !== newPos.line ||
      cachedCursor.value.ch !== newPos.ch
    ) {
      const line = state.doc.line(newPos.line + 1)
      const selUpdate = EditorSelection.cursor(line.from + newPos.ch - 1)

      view.value?.focus()

      dispatch({
        scrollIntoView: true,
        selection: selUpdate,
        effects: EditorView.scrollTo.of(selUpdate),
      })
    }
  })

  watch(
    () => options.extendedEditorConfig.lineWrapping,
    (newMode) => {
      dispatch({
        effects: lineWrapping.reconfigure(
          newMode ? [EditorView.lineWrapping] : []
        ),
      })
    }
  )

  watch(
    () => [
      options.extendedEditorConfig.mode,
      options.linter,
      options.completer,
    ],
    () => {
      dispatch({
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

  watch(el, (newEl) => {
    if (view.value) {
      view.value.destroy()
      view.value = undefined
    }

    if (newEl) {
      view.value = new EditorView({
        state,
        parent: newEl,
      })
    }
  })

  watch(value, (newVal) => {
    if (cachedValue.value !== newVal) {
      dispatch({
        changes: {
          from: 0,
          to: state.doc.length,
          insert: newVal,
        },
      })
    }
  })

  return {
    cursor,
  }
}
