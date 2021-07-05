<template>
  <div class="show-if-initialized" :class="{ initialized }">
    <div v-if="lang == 'json'" class="outline">
      <div v-for="(p, index) in currPath" :key="index" class="block">
        <div class="label" @click="onBlockClick(index)">
          {{ p }}
        </div>
        <i v-if="index + 1 !== currPath.length" class="material-icons"
          >chevron_right</i
        >
        <div
          v-if="sibDropDownIndex == index"
          :ref="`sibling-${index}`"
          class="siblings"
          @mouseleave="clearSibList"
        >
          <div
            v-for="(sib, i) in currSib"
            :key="i"
            class="sib"
            @click="goToSib(sib)"
          >
            {{ sib.key ? sib.key.value : i }}
          </div>
        </div>
      </div>
    </div>
    <pre ref="editor" :class="styles"></pre>
  </div>
</template>

<script>
import ace from "ace-builds"
import "ace-builds/webpack-resolver"
import jsonParse from "~/helpers/jsonParse"
import debounce from "~/helpers/utils/debounce"
import outline from "~/helpers/outline"

export default {
  props: {
    provideJSONOutline: {
      type: Boolean,
      default: false,
      required: false,
    },
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
      default: () => {},
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
      currPath: [],
      currSib: [],
      sibDropDownIndex: null,
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

    if (this.lang === "json" && this.provideJSONOutline)
      this.initOutline(this.value)

    editor.on("change", () => {
      const content = editor.getValue()
      this.$emit("input", content)
      this.cacheValue = content

      if (this.provideJSONOutline) debounce(this.initOutline(content), 500)

      if (this.lint) this.provideLinting(content)
    })

    if (this.lang === "json" && this.provideJSONOutline) {
      editor.session.selection.on("changeCursor", () => {
        const index = editor.session.doc.positionToIndex(
          editor.selection.getCursor(),
          0
        )
        const path = this.outline.genPath(index)
        if (path.success) {
          this.currPath = path.res
        }
      })
      document.addEventListener("touchstart", this.onTouchStart)
    }

    // Disable linting, if lint prop is false
    if (this.lint) this.provideLinting(this.value)
  },

  destroyed() {
    this.editor.destroy()
    document.removeEventListener("touchstart", this.onTouchStart)
  },

  methods: {
    defineTheme() {
      if (this.theme) {
        return this.theme
      }
      const strip = (str) =>
        str.replace(/#/g, "").replace(/ /g, "").replace(/"/g, "")
      return strip(
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--editor-theme")
      )
    },

    provideLinting: debounce(function (code) {
      if (this.lang === "json") {
        try {
          jsonParse(code)
          this.editor.session.setAnnotations([])
        } catch (e) {
          const pos = this.editor.session
            .getDocument()
            .indexToPosition(e.start, 0)
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
    onBlockClick(index) {
      if (this.sibDropDownIndex === index) {
        this.clearSibList()
      } else {
        this.currSib = this.outline.getSiblings(index)
        if (this.currSib.length) this.sibDropDownIndex = index
      }
    },
    clearSibList() {
      this.currSib = []
      this.sibDropDownIndex = null
    },
    goToSib(obj) {
      this.clearSibList()
      if (obj.start) {
        const pos = this.editor.session.doc.indexToPosition(obj.start, 0)
        if (pos) {
          this.editor.session.selection.moveCursorTo(pos.row, pos.column, true)
          this.editor.session.selection.clearSelection()
          this.editor.scrollToLine(pos.row, false, true, null)
        }
      }
    },
    initOutline: debounce(function (content) {
      if (this.lang === "json") {
        try {
          this.outline.init(content)

          if (content[0] === "[") this.currPath.push("[]")
          else this.currPath.push("{}")
        } catch (e) {
          console.log("Outline error: ", e)
        }
      }
    }),
    onTouchStart(e) {
      if (
        this.sibDropDownIndex !== null &&
        e.target.parentElement !==
          this.$refs[`sibling-${this.sibDropDownIndex}`][0]
      ) {
        this.clearSibList()
      }
    },
  },
}
</script>

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
  @apply flex flex-nowrap;
  @apply w-full;
  @apply overflow-auto;
  @apply font-mono;
  @apply shadow-lg;
  @apply px-4;

  .block {
    @apply inline-flex;
    @apply items-center;
    @apply flex-grow-0 flex-shrink-0;
    @apply text-secondaryLight text-sm;

    &:hover {
      @apply text-secondary;
      @apply cursor-pointer;
    }

    .label {
      @apply p-2;
    }

    .siblings {
      @apply absolute;
      @apply z-50;
      @apply top-9;
      @apply bg-primary;
      @apply max-h-60;
      @apply overflow-auto;
      @apply shadow-lg;
      @apply text-secondaryLight;
      @apply overscroll-none;

      border-radius: 0 0 8px 8px;
    }

    .sib {
      @apply px-4 py-1;

      &:hover {
        @apply text-secondary;
        @apply bg-primaryLight;
      }
    }
  }
}
</style>
