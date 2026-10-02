/**
 * Monaco setup, imported only by the lazily-loaded script editor so that
 * Monaco and its workers stay out of the app's startup bundle.
 */
import { loader } from "@guolao/vue-monaco-editor"
import * as monaco from "monaco-editor"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "typescript") {
      return new tsWorker()
    }

    return new editorWorker()
  },
}

loader.config({ monaco })
