<script setup lang="ts">
import { jsonLanguage } from "@codemirror/lang-json"
import { MergeView } from "@codemirror/merge"
import { onUnmounted, ref, watch } from "vue"
import { basicSetup, baseTheme } from "@helpers/editor/themes/baseTheme"

type MergeViewContent = {
  content: string
  langMime: string
}

const props = defineProps<{
  contentLeft: MergeViewContent
  contentRight: MergeViewContent
}>()

const diffEditor = ref<Element | null>(null)
let mergeView: MergeView | null = null

watch(
  () => props.contentRight,
  () => {
    if (!mergeView) {
      return
    }

    mergeView.b.dispatch({
      changes: {
        from: 0,
        to: mergeView.b.state.doc.length,
        insert: props.contentRight.content,
      },
    })
  }
)

watch(
  diffEditor,
  () => {
    if (!diffEditor.value) {
      return
    }

    mergeView = new MergeView({
      a: {
        doc: props.contentLeft.content,
        extensions: [jsonLanguage, basicSetup, baseTheme],
      },
      b: {
        doc: props.contentRight.content,
        extensions: [jsonLanguage, basicSetup, baseTheme],
      },
      parent: diffEditor.value,
      highlightChanges: false,
    })
  },
  {
    immediate: true,
  }
)

onUnmounted(() => {
  if (mergeView) {
    mergeView.destroy()
  }
})
</script>

<template>
  <div ref="diffEditor"></div>
</template>
