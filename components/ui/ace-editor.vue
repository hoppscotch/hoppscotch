<template>
  <div class="show-if-initialized" :class="{ initialized }">
    <pre ref="editor"></pre>
  </div>
</template>

<style lang="scss">
.show-if-initialized {
  opacity: 0;

  &.initialized {
    opacity: 1;
  }

  & > * {
    transition: none;
  }
}
</style>

<script>
const DEFAULT_THEME = "twilight"

import ace from "ace-builds"
import "ace-builds/webpack-resolver"
import jsonParse from "~/helpers/jsonParse"
import debounce from "~/helpers/utils/debounce"

import * as esprima from "esprima"

export default {
  props: {
    value: {
      type: String,
      default: "",
    },
    theme: {
      type: String,
      required: false,
    },
    lang: {
      type: String,
      default: "json",
    },
    lint: {
      type: Boolean,
      default: true,
      required: false,
    },
    options: {
      type: Object,
      default: {},
    },
  },

  data() {
    return {
      initialized: false,
      editor: null,
      cacheValue: "",
    }
  },

  watch: {
    value(value) {
      if (value !== this.cacheValue) {
        this.editor.session.setValue(value, 1)
        this.cacheValue = value
        if (this.lint) this.provideLinting(value)
      }
    },
    theme() {
      this.initialized = false
      this.editor.setTheme(`ace/theme/${this.defineTheme()}`, () => {
        this.$nextTick().then(() => {
          this.initialized = true
        })
      })
    },
    lang(value) {
      this.editor.getSession().setMode("ace/mode/" + value)
    },
    options(value) {
      this.editor.setOptions(value)
    },
  },

  mounted() {
    const editor = ace.edit(this.$refs.editor, {
      mode: `ace/mode/${this.lang}`,
      ...this.options,
    })

    // Set the theme and show the editor only after it's been set to prevent FOUC.
    editor.setTheme(`ace/theme/${this.defineTheme()}`, () => {
      this.$nextTick().then(() => {
        this.initialized = true
      })
    })

    if (this.value) editor.setValue(this.value, 1)

    this.editor = editor
    this.cacheValue = this.value

    editor.on("change", () => {
      const content = editor.getValue()
      this.$emit("input", content)
      this.cacheValue = content
      if (this.lint) this.provideLinting(content)
    })

    // Disable linting, if lint prop is false
    if (this.lint) this.provideLinting(this.value)
  },

  methods: {
    defineTheme() {
      if (this.theme) {
        return this.theme
      }
      return this.$store.state.postwoman.settings.THEME_ACE_EDITOR || DEFAULT_THEME
    },

    provideLinting: debounce(function (code) {
      if (this.lang === "json") {
        try {
          jsonParse(code)
          this.editor.session.setAnnotations([])
        } catch (e) {
          const pos = this.editor.session.getDocument().indexToPosition(e.start, 0)
          this.editor.session.setAnnotations([
            {
              row: pos.row,
              column: pos.column,
              text: e.message,
              type: "error",
            },
          ])
        }
      } else if (this.lang === "javascript") {
        try {
          const res = esprima.parseScript(code, { tolerant: true })
          console.log(res)
          if (res.errors && res.errors.length > 0) {
            this.editor.session.setAnnotations(
              res.errors.map((err) => {
                const pos = this.editor.session.getDocument().indexToPosition(err.index, 0)

                console.log({
                  row: pos.row,
                  column: pos.column,
                  text: err.description,
                  type: "error",
                })
                return {
                  row: pos.row,
                  column: pos.column,
                  text: err.description,
                  type: "error",
                }
              })
            )
          }
        } catch (e) {
          const pos = this.editor.session.getDocument().indexToPosition(e.index, 0)
          this.editor.session.setAnnotations([
            {
              row: pos.row,
              column: pos.column,
              text: e.description,
              type: "error",
            },
          ])
        }
      }
    }, 2000),
  },

  destroyed() {
    this.editor.destroy()
  },
}
</script>
