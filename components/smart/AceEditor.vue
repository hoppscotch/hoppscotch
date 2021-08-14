<template>
  <div class="show-if-initialized" :class="{ initialized }">
    <pre ref="editor" :class="styles"></pre>
    <div
      v-if="provideJSONOutline"
      class="
        bg-primaryLight
        border-t border-divider
        flex flex-nowrap flex-1
        py-1
        px-4
        bottom-0
        z-10
        sticky
        overflow-auto
        hide-scrollbar
      "
    >
      <div
        v-for="(p, index) in currentPath"
        :key="`p-${index}`"
        class="
          cursor-pointer
          flex-grow-0 flex-shrink-0
          text-secondaryLight
          inline-flex
          items-center
          hover:text-secondary
        "
      >
        <span @click="onBlockClick(index)">
          {{ p }}
        </span>
        <i v-if="index + 1 !== currentPath.length" class="mx-2 material-icons">
          chevron_right
        </i>
        <tippy
          v-if="siblingDropDownIndex == index"
          ref="options"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <SmartItem
            v-for="(sibling, siblingIndex) in currentSibling"
            :key="`p-${index}-sibling-${siblingIndex}`"
            :label="sibling.key ? sibling.key.value : i"
            @click.native="goToSibling(sibling)"
          />
        </tippy>
      </div>
    </div>
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
      currentPath: [],
      currentSibling: [],
      siblingDropDownIndex: null,
    }
  },

  computed: {
    appFontSize() {
      return getComputedStyle(document.documentElement).getPropertyValue(
        "--body-font-size"
      )
    },
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

    editor.setFontSize(this.appFontSize)

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
          this.currentPath = path.res
        }
      })
    }

    // Disable linting, if lint prop is false
    if (this.lint) this.provideLinting(this.value)
  },

  destroyed() {
    this.editor.destroy()
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
      if (this.siblingDropDownIndex === index) {
        this.clearSiblingList()
      } else {
        this.currentSibling = this.outline.getSiblings(index)
        if (this.currentSibling.length) this.siblingDropDownIndex = index
      }
    },
    clearSiblingList() {
      this.currentSibling = []
      this.siblingDropDownIndex = null
    },
    goToSibling(obj) {
      this.clearSiblingList()
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

          if (content[0] === "[") this.currentPath.push("[]")
          else this.currentPath.push("{}")
        } catch (e) {
          console.log("Outline error: ", e)
        }
      }
    }),
  },
}
</script>

<style scoped lang="scss">
.show-if-initialized {
  &.initialized {
    @apply opacity-100;
  }

  & > * {
    @apply transition-none;
  }
}
</style>
