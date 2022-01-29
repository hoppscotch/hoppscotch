<!--
 This code is a complete adaptation of the work done here
 https://github.com/SyedWasiHaider/vue-highlightable-input
-->

<template>
  <div class="env-input-container">
    <div
      ref="editor"
      :placeholder="placeholder"
      class="env-input"
      :class="styles"
      contenteditable="true"
      spellcheck="false"
      @keydown.enter.prevent="$emit('enter', $event)"
      @keyup="$emit('keyup', $event)"
      @click="$emit('click', $event)"
      @keydown="$emit('keydown', $event)"
      @paste="handlePaste"
      @compositionend="handleCompositionEnd"
    ></div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import IntervalTree from "node-interval-tree"
import debounce from "lodash/debounce"
import isUndefined from "lodash/isUndefined"
import { tippy } from "vue-tippy"
import * as E from "fp-ts/Either"
import { aggregateEnvs$ } from "~/newstore/environments"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { parseTemplateStringE } from "~/helpers/templating"

const tagsToReplace = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
}

export default defineComponent({
  props: {
    value: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "",
    },
    styles: {
      type: String,
      default: "",
    },
  },
  setup() {
    const aggregateEnvs = useReadonlyStream(aggregateEnvs$)
    return {
      aggregateEnvs,
    }
  },
  data() {
    return {
      internalValue: "",
      htmlOutput: "",
      debouncedHandler: null,
      highlight: [
        {
          text: /(<<\w+>>)/g,
          style:
            "cursor-help transition rounded px-1 focus:outline-none mx-0.5",
        },
      ],
      highlightEnabled: true,
      highlightStyle: "",
      caseSensitive: true,
      fireOn: "input",
      fireOnEnabled: true,
    }
  },

  watch: {
    aggregateEnvs() {
      this.processHighlights()
    },
    highlightStyle() {
      this.processHighlights()
    },
    highlight() {
      this.processHighlights()
    },
    value() {
      if (this.internalValue !== this.value) {
        this.internalValue = this.value
        this.processHighlights()
      }
    },
    highlightEnabled() {
      this.processHighlights()
    },
    caseSensitive() {
      this.processHighlights()
    },
    htmlOutput() {
      const selection = this.saveSelection(this.$refs.editor)
      this.$refs.editor.innerHTML = this.htmlOutput
      this.restoreSelection(this.$refs.editor, selection)
    },
  },

  mounted() {
    if (this.fireOnEnabled)
      this.$refs.editor.addEventListener(this.fireOn, this.handleChange)
    this.internalValue = this.value
    this.processHighlights()
  },

  methods: {
    handleCompositionEnd() {
      this.handleChange()
    },
    handlePaste(ev) {
      this.handleChange()
      this.$emit("paste", { event: ev, previousValue: this.internalValue })
    },
    handleChange(e = null) {
      if (e && "inputType" in e && e.inputType === "insertCompositionText") {
        return
      }
      this.debouncedHandler = debounce(function () {
        if (this.$refs.editor) {
          if (this.internalValue !== this.$refs.editor.textContent) {
            this.internalValue = this.$refs.editor.textContent
            this.processHighlights()
          }
        }
      }, 5)
      this.debouncedHandler()
    },
    processHighlights() {
      if (!this.highlightEnabled) {
        this.htmlOutput = this.internalValue
        if (this.intervalTree !== this.value) {
          this.$emit("input", this.internalValue)
          this.$emit("change", this.internalValue)
        }
        return
      }

      const intervalTree = new IntervalTree()

      let highlightPositions = []
      const sortedHighlights = this.normalizedHighlights()

      if (!sortedHighlights) return

      for (let i = 0; i < sortedHighlights.length; i++) {
        const highlightObj = sortedHighlights[i]
        let indices = []

        if (highlightObj.text) {
          if (typeof highlightObj.text === "string") {
            indices = this.getIndicesOf(
              highlightObj.text,
              this.internalValue,
              isUndefined(highlightObj.caseSensitive)
                ? this.caseSensitive
                : highlightObj.caseSensitive
            )
            indices.forEach((start) => {
              const end = start + highlightObj.text.length - 1
              this.insertRange(start, end, highlightObj, intervalTree)
            })
          }
          if (
            Object.prototype.toString.call(highlightObj.text) ===
            "[object RegExp]"
          ) {
            indices = this.getRegexIndices(
              highlightObj.text,
              this.internalValue
            )
            indices.forEach((pair) => {
              this.insertRange(pair.start, pair.end, highlightObj, intervalTree)
            })
          }
        }
        if (
          highlightObj.start !== undefined &&
          highlightObj.end !== undefined &&
          highlightObj.start < highlightObj.end
        ) {
          const start = highlightObj.start
          const end = highlightObj.end - 1

          this.insertRange(start, end, highlightObj, intervalTree)
        }
      }

      highlightPositions = intervalTree.search(0, this.internalValue.length)
      highlightPositions = highlightPositions.sort((a, b) => a.start - b.start)

      let result = ""
      let startingPosition = 0

      for (let k = 0; k < highlightPositions.length; k++) {
        const position = highlightPositions[k]
        result += this.safe_tags_replace(
          this.internalValue.substring(startingPosition, position.start)
        )
        const envVar = this.internalValue
          .substring(position.start, position.end + 1)
          .slice(2, -2)
        result += `<span class="${highlightPositions[k].style} ${
          this.aggregateEnvs.find((k) => k.key === envVar)?.value === undefined
            ? "bg-red-400 text-red-50 hover:bg-red-600"
            : "bg-accentDark text-accentContrast hover:bg-accent"
        }" v-tippy data-tippy-content="${this.getEnvName(
          this.aggregateEnvs.find((k) => k.key === envVar)?.sourceEnv
        )}<xmp>${this.getEnvValue(
          this.constructEnv(envVar)
        )}</xmp>">${this.safe_tags_replace(
          this.internalValue.substring(position.start, position.end + 1)
        )}</span>`
        startingPosition = position.end + 1
      }
      if (startingPosition < this.internalValue.length)
        result += this.safe_tags_replace(
          this.internalValue.substring(
            startingPosition,
            this.internalValue.length
          )
        )
      if (result[result.length - 1] === " ") {
        result = result.substring(0, result.length - 1)
        result += "&nbsp;"
      }
      this.htmlOutput = result

      this.$nextTick(() => {
        this.renderTippy()
      })

      if (this.internalValue !== this.value) {
        this.$emit("input", this.internalValue)
        this.$emit("change", this.internalValue)
      }
    },
    renderTippy() {
      const tippable = document.querySelectorAll("[v-tippy]")
      tippable.forEach((t) => {
        tippy(t, {
          content: t.dataset["tippy-content"],
          theme: "tooltip",
          popperOptions: {
            modifiers: {
              preventOverflow: {
                enabled: false,
              },
              hide: {
                enabled: false,
              },
            },
          },
        })
      })
    },
    insertRange(start, end, highlightObj, intervalTree) {
      const overlap = intervalTree.search(start, end)
      const maxLengthOverlap = overlap.reduce((max, o) => {
        return Math.max(o.end - o.start, max)
      }, 0)
      if (overlap.length === 0) {
        intervalTree.insert(start, end, {
          start,
          end,
          style: highlightObj.style,
        })
      } else if (end - start > maxLengthOverlap) {
        overlap.forEach((o) => {
          intervalTree.remove(o.start, o.end, o)
        })
        intervalTree.insert(start, end, {
          start,
          end,
          style: highlightObj.style,
        })
      }
    },
    normalizedHighlights() {
      if (this.highlight == null) return null
      if (
        Object.prototype.toString.call(this.highlight) === "[object RegExp]" ||
        typeof this.highlight === "string"
      )
        return [{ text: this.highlight }]

      if (
        Object.prototype.toString.call(this.highlight) === "[object Array]" &&
        this.highlight.length > 0
      ) {
        const globalDefaultStyle =
          typeof this.highlightStyle === "string"
            ? this.highlightStyle
            : Object.keys(this.highlightStyle)
                .map((key) => key + ":" + this.highlightStyle[key])
                .join(";") + ";"

        const regExpHighlights = this.highlight.filter(
          (x) => (x === Object.prototype.toString.call(x)) === "[object RegExp]"
        )
        const nonRegExpHighlights = this.highlight.filter(
          (x) => (x === Object.prototype.toString.call(x)) !== "[object RegExp]"
        )
        return nonRegExpHighlights
          .map((h) => {
            if (h.text || typeof h === "string") {
              return {
                text: h.text || h,
                style: h.style || globalDefaultStyle,
                caseSensitive: h.caseSensitive,
              }
            } else if (h.start !== undefined && h.end !== undefined) {
              return {
                style: h.style || globalDefaultStyle,
                start: h.start,
                end: h.end,
                caseSensitive: h.caseSensitive,
              }
            } else {
              throw new Error(
                "Please provide a valid highlight object or string"
              )
            }
          })
          .sort((a, b) =>
            a.text && b.text
              ? a.text > b.text
              : a.start === b.start
              ? a.end < b.end
              : a.start < b.start
          )
          .concat(regExpHighlights)
      }
      console.error("Expected a string or an array of strings")
      return null
    },
    safe_tags_replace(str) {
      return str.replace(/[&<>]/g, this.replaceTag)
    },
    replaceTag(tag) {
      return tagsToReplace[tag] || tag
    },
    getRegexIndices(regex, str) {
      if (!regex.global) {
        console.error("Expected " + regex + " to be global")
        return []
      }

      regex = RegExp(regex)
      const indices = []
      let match = null

      while ((match = regex.exec(str)) != null) {
        indices.push({
          start: match.index,
          end: match.index + match[0].length - 1,
        })
      }
      return indices
    },
    getIndicesOf(searchStr, str, caseSensitive) {
      const searchStrLen = searchStr.length

      if (searchStrLen === 0) {
        return []
      }

      let startIndex = 0
      let index
      const indices = []

      if (!caseSensitive) {
        str = str.toLowerCase()
        searchStr = searchStr.toLowerCase()
      }
      while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index)
        startIndex = index + searchStrLen
      }
      return indices
    },
    saveSelection(containerEl) {
      let start

      if (window.getSelection && document.createRange) {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        const preSelectionRange = range.cloneRange()
        preSelectionRange.selectNodeContents(containerEl)
        preSelectionRange.setEnd(range.startContainer, range.startOffset)
        start = `${preSelectionRange}`.length
        return {
          start,
          end: start + `${range}`.length,
        }
      } else if (document.selection) {
        const selectedTextRange = document.selection.createRange()
        const preSelectionTextRange = document.body.createTextRange()
        preSelectionTextRange.moveToElementText(containerEl)
        preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange)
        start = preSelectionTextRange.text.length
        return {
          start,
          end: start + selectedTextRange.text.length,
        }
      }
    },
    // Copied but modifed slightly from: https://stackoverflow.com/questions/14636218/jquery-convert-text-url-to-link-as-typing/14637351#14637351
    restoreSelection(containerEl, savedSel) {
      if (!savedSel) return
      if (window.getSelection && document.createRange) {
        let charIndex = 0
        const range = document.createRange()

        range.setStart(containerEl, 0)
        range.collapse(true)

        const nodeStack = [containerEl]
        let node
        let foundStart = false
        let stop = false

        while (!stop && (node = nodeStack.pop())) {
          if (node.nodeType === 3) {
            const nextCharIndex = charIndex + node.length
            if (
              !foundStart &&
              savedSel.start >= charIndex &&
              savedSel.start <= nextCharIndex
            ) {
              range.setStart(node, savedSel.start - charIndex)
              foundStart = true
            }
            if (
              foundStart &&
              savedSel.end >= charIndex &&
              savedSel.end <= nextCharIndex
            ) {
              range.setEnd(node, savedSel.end - charIndex)
              stop = true
            }
            charIndex = nextCharIndex
          } else {
            let i = node.childNodes.length
            while (i--) {
              nodeStack.push(node.childNodes[i])
            }
          }
        }
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } else if (document.selection) {
        const textRange = document.body.createTextRange()
        textRange.moveToElementText(containerEl)
        textRange.collapse(true)
        textRange.moveEnd("character", savedSel.end)
        textRange.moveStart("character", savedSel.start)
        textRange.select()
      }
    },
    getEnvName(name) {
      if (name) return name
      return "choose an environment"
    },
    getEnvValue(value) {
      if (value) return value.replace(/"/g, "&quot;")
      // it does not filter special characters before adding them to HTML.
      return "not found"
    },
    constructEnv(envVar) {
      const result = parseTemplateStringE(
        this.getEnvValue(
          this.aggregateEnvs.find((k) => k.key === envVar)?.value
        ),
        this.aggregateEnvs
      )

      if (E.isLeft(result)) {
        console.error("error", result.left)
        return ""
      } else {
        return result.right
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.env-input-container {
  @apply relative;
  @apply inline-grid;
  @apply flex-1;
}

[contenteditable] {
  @apply select-text;
  @apply text-secondaryDark;

  &:empty {
    @apply leading-loose;

    &::before {
      @apply text-secondary;
      @apply opacity-35;
      @apply pointer-events-none;

      content: attr(placeholder);
    }
  }
}

.env-input {
  @apply flex;
  @apply items-center;
  @apply justify-items-start;
  @apply whitespace-nowrap;
  @apply overflow-x-auto;
  @apply overflow-y-hidden;
  @apply resize-none;
  @apply focus:outline-none;
}

.env-input::-webkit-scrollbar {
  @apply hidden;
}
</style>
