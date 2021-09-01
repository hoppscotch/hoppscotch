import CodeMirror from "codemirror"

import "codemirror/theme/juejin.css"

import "codemirror/lib/codemirror.css"
import "codemirror/addon/lint/lint.css"

import "codemirror/addon/fold/foldgutter.css"
import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/comment-fold"
import "codemirror/addon/fold/indent-fold"
import "codemirror/addon/display/autorefresh"
import "codemirror/addon/lint/lint"

import { watch, onMounted, ref, Ref } from "@nuxtjs/composition-api"
import { LinterDefinition } from "./linting/linter"

const DEFAULT_THEME = "juejin"

type CodeMirrorOptions = {
  extendedEditorConfig: CodeMirror.EditorConfiguration
  linter: LinterDefinition | null
}

const DEFAULT_EDITOR_CONFIG: CodeMirror.EditorConfiguration = {
  theme: DEFAULT_THEME,
  autoRefresh: true,
  lineNumbers: true,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
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
) {
  const cm = ref<CodeMirror.Editor | null>(null)

  // Boot-up CodeMirror, set the value and listeners
  onMounted(() => {
    cm.value = CodeMirror(el.value!, {
      ...DEFAULT_EDITOR_CONFIG,
      ...options.extendedEditorConfig,
    })
    cm.value.setValue(value.value)

    if (options.linter) {
      cm.value.setOption("lint", options.linter)
    }

    cm.value.on("change", (instance) => {
      // External update propagation (via watchers) should be ignored
      if (instance.getValue() !== value.value) {
        value.value = instance.getValue()
      }
    })
  })

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

  return {
    cm,
  }
}
