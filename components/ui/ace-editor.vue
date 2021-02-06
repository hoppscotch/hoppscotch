<template>
  <div class="show-if-initialized" :class="{ initialized }">
    <div class="outline" v-if="lang == 'json'">
      <div class="block" v-for="(p, index) in currPath" :key="index">
        {{ p }}
        <div class="next">></div>
      </div>
    </div>
    <pre ref="editor" :class="styles"></pre>
  </div>
</template>

<style lang="scss">
.show-if-initialized {
  @apply opacity-0;

  &.initialized {
    @apply opacity-100;
  }

  & > * {
    @apply transition-none;
  }
}

.outline {
  @apply flex;
  @apply text-fgLightColor;
  @apply text-sm;

  .block {
    @apply px-1;
    @apply flex;

    &:hover {
      @apply text-fgColor;
      @apply cursor-pointer;
    }

    &:active {
      @apply bg-bgLightColor;
      @apply cursor-pointer;
    }

    .next {
      @apply px-2;
    }
  }
}
</style>

<script>
import ace from "ace-builds"
import "ace-builds/webpack-resolver"
import jsonParse from "~/helpers/jsonParse"
import debounce from "~/helpers/utils/debounce"
import outline from "~/helpers/outline"

export default {
  props: {
    value: {
      type: String,
      default: "",
    },
    theme: {
      type: String,
      required: false,
      default: null,
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
    styles: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      initialized: false,
      editor: null,
      cacheValue: "",
      outline: outline(),
      showOutline: false,
      currPath: [],
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
      this.editor.getSession().setMode(`ace/mode/${value}`)
      if (lang == "json") this.showOutline = true
      else this.showOutline = false
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
    this.outline.init(this.value)

    editor.on("change", () => {
      const content = editor.getValue()
      this.$emit("input", content)
      this.cacheValue = content
      if (this.lint) this.provideLinting(content)
    })

    editor.session.selection.on("changeCursor", (e) => {
      const index = editor.session.doc.positionToIndex(editor.selection.getCursor(), 0)
      const path = this.outline.genPath(index)
      if (path.success) {
        this.currPath = path.res
        this.showOutline = true
      } else {
        this.showOutline = false
      }
    })

    // Disable linting, if lint prop is false
    if (this.lint) this.provideLinting(this.value)
  },

  methods: {
    defineTheme() {
      if (this.theme) {
        return this.theme
      }
      const strip = (str) => str.replace(/#/g, "").replace(/ /g, "").replace(/"/g, "")
      return strip(
        window.getComputedStyle(document.documentElement).getPropertyValue("--editor-theme")
      )
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
      }
    }, 2000),
  },

  destroyed() {
    this.editor.destroy()
  },
}
</script>
