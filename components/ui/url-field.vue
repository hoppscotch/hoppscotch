<template>
  <div contenteditable class="url-field" ref="editor" spellcheck="false"></div>
</template>
<style lang="scss">
.highlight-VAR {
  @apply font-bold;
  color: var(--ac-color);
}
.highlight-TEXT {
  @apply overflow-auto;
  @apply break-all;
  height: 20px;
}
.highlight-TEXT::-webkit-scrollbar {
  @apply hidden;
}
</style>
<script>
export default {
  props: {
    value: { type: String },
  },
  data() {
    return {
      cacheValue: null,
      unwatchValue: null,
    }
  },
  mounted() {
    this.$refs.editor.addEventListener("input", this.updateEditor)
    this.$refs.editor.textContent = this.value || ""

    this.cacheValue = this.value || ""

    this.unwatchValue = this.$watch(
      () => this.value,
      (newVal) => {
        if (this.$refs.editor && this.cacheValue !== newVal)
          this.$refs.editor.textContent = newVal || ""
        this.updateEditor()
      }
    )

    this.updateEditor()
  },
  beforeDestroy() {
    this.unwatchValue()
    this.$refs.editor.removeEventListener("input", this.updateEditor)
  },
  methods: {
    renderText(text) {
      const fixedText = text.replace(/(\r\n|\n|\r)/gm, "").trim()
      const parseMap = this.parseURL(fixedText)

      const convertSpan = document.createElement("span")

      const output = parseMap.map(([start, end, protocol]) => {
        convertSpan.textContent = fixedText.substring(start, end + 1)
        return `<span class='highlight-${protocol}'>${convertSpan.innerHTML}</span>`
      })

      return output.join("")
    },
    parseURL(text) {
      const map = []
      const regex = /<<\w+>>/

      let match
      let index = 0
      while ((match = text.substring(index).match(regex))) {
        map.push([index, index + (match.index - 1), "TEXT"])
        map.push([index + match.index, index + match.index + match[0].length - 1, "VAR"])
        index += match.index + match[0].length

        if (index >= text.length - 1) break
      }

      if (text.length > index && !text.substring(index).match(regex)) {
        map.push([index, text.length, "TEXT"])
      }

      return map
    },
    getTextSegments(element) {
      const textSegments = []
      Array.from(element.childNodes).forEach((node) => {
        switch (node.nodeType) {
          case Node.TEXT_NODE:
            textSegments.push({ text: node.nodeValue, node })
            break

          case Node.ELEMENT_NODE:
            textSegments.splice(textSegments.length, 0, ...this.getTextSegments(node))
            break
        }
      })
      return textSegments
    },
    restoreSelection(absoluteAnchorIndex, absoluteFocusIndex) {
      const sel = window.getSelection()
      const textSegments = this.getTextSegments(this.$refs.editor)
      let anchorNode = this.$refs.editor
      let anchorIndex = 0
      let focusNode = this.$refs.editor
      let focusIndex = 0
      let currentIndex = 0
      textSegments.forEach(({ text, node }) => {
        const startIndexOfNode = currentIndex
        const endIndexOfNode = startIndexOfNode + text.length
        if (startIndexOfNode <= absoluteAnchorIndex && absoluteAnchorIndex <= endIndexOfNode) {
          anchorNode = node
          anchorIndex = absoluteAnchorIndex - startIndexOfNode
        }
        if (startIndexOfNode <= absoluteFocusIndex && absoluteFocusIndex <= endIndexOfNode) {
          focusNode = node
          focusIndex = absoluteFocusIndex - startIndexOfNode
        }
        currentIndex += text.length
      })

      sel.setBaseAndExtent(anchorNode, anchorIndex, focusNode, focusIndex)
    },
    updateEditor() {
      this.cacheValue = this.$refs.editor.textContent

      const sel = window.getSelection()
      const textSegments = this.getTextSegments(this.$refs.editor)
      const textContent = textSegments.map(({ text }) => text).join("")

      let anchorIndex = null
      let focusIndex = null
      let currentIndex = 0

      textSegments.forEach(({ text, node }) => {
        if (node === sel.anchorNode) {
          anchorIndex = currentIndex + sel.anchorOffset
        }
        if (node === sel.focusNode) {
          focusIndex = currentIndex + sel.focusOffset
        }
        currentIndex += text.length
      })

      this.$refs.editor.innerHTML = this.renderText(textContent)

      this.restoreSelection(anchorIndex, focusIndex)

      this.$emit("input", this.$refs.editor.textContent)
    },
  },
}
</script>
