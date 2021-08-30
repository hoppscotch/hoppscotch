<template>
  <div ref="editor" class="w-full block"></div>
</template>

<script>
import Codemirror from "codemirror"

import "codemirror/lib/codemirror.css"
import "codemirror/theme/juejin.css"
import "codemirror/addon/fold/foldgutter.css"

import "codemirror/addon/fold/foldgutter"
import "codemirror/addon/fold/brace-fold"
import "codemirror/addon/fold/comment-fold"
import "codemirror/addon/fold/indent-fold"

import "codemirror/mode/javascript/javascript"

const DEFAULT_THEME = "juejin"

export default {
  props: {
    value: {
      type: String,
      default: "",
    },
    mode: {
      type: Object,
      default: () => {
        return {
          name: "javascript",
          json: true,
        }
      },
    },
  },

  data() {
    return {
      editor: null,
      cacheValue: "",
    }
  },

  watch: {
    value(value) {
      if (value !== this.cacheValue) {
        this.editor.setValue(value)
        this.cacheValue = value
      }
    },
    mode(mode) {
      this.editor.setOption("mode", mode)
    },
  },

  mounted() {
    console.log(Codemirror.modes)
    this.editor = Codemirror(this.$refs.editor, {
      value: this.value,
      mode: this.mode,
      lineNumbers: true,
      inputStyle: "textarea",
      foldGutter: true,
      theme: DEFAULT_THEME,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    })
    this.editor.on("change", (instance) => {
      const val = instance.doc.getValue()
      this.cacheValue = val
      this.$emit("input", val)
    })
  },
}
</script>

<style>
.CodeMirror {
  @apply block;
  @apply border-b;
  @apply border-dividerLight;
  @apply h-auto;
  @apply w-full;
}
</style>
