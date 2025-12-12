<template>
  <div
    v-if="!(readOnly && isEmpty)"
    class="rounded-sm relative h-full"
    @click.stop
  >
    <!-- Edit mode textarea -->
    <template v-if="editMode && !readOnly">
      <textarea
        ref="textareaRef"
        v-model="internalContent"
        class="text-wrap w-full p-4 rounded-sm text-sm font-mono text-secondary outline-none resize-none focus:border focus:border-accent focus:bg-primaryLight transition placeholder:text-secondaryLight"
        :style="{ height: textareaHeight + 'px' }"
        spellcheck="false"
        :placeholder="placeholder"
        @blur="handleBlur"
        @click.stop
        @input="adjustTextareaHeight"
      ></textarea>
    </template>

    <!-- Preview mode with rendered markdown (safe: sanitized by DOMPurify) -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else
      :class="[
        'min-h-52 p-4 prose prose-invert prose-sm max-w-none markdown-content relative border border-transparent rounded-sm',
        {
          'cursor-text hover:bg-primaryLight transition': !readOnly,
          'cursor-text select-auto': readOnly,
        },
      ]"
      @click.stop="enableEditMode"
      v-html="renderedMarkdown"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted } from "vue"
import MarkdownIt from "markdown-it"
import DOMPurify from "dompurify"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    readOnly?: boolean
  }>(),
  {
    modelValue: "",
    placeholder: "Add description here...",
    readOnly: false,
  }
)

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "blur"): void
}>()

// Initialize MarkdownIt
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

// Edit mode state and content management
const editMode = ref<boolean>(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const textareaHeight = ref<number>(200)

// Internal content that syncs with modelValue
const internalContent = ref<string>(props.modelValue)

// Check if the content is empty
const isEmpty = computed(
  () => !internalContent.value || internalContent.value.trim() === ""
)

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editMode.value) {
      internalContent.value = newValue
    }
  },
  { immediate: true }
)

// Render markdown content with DOMPurify sanitization
const renderedMarkdown = computed(() => {
  try {
    if (isEmpty.value) {
      return DOMPurify.sanitize(
        `<p class='text-secondaryLight italic'>${props.placeholder || t("documentation.add_description_placeholder")}</p>`
      )
    }

    // Render markdown first, then sanitize the HTML output with DOMPurify
    const rawHtml = md.render(internalContent.value)
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return DOMPurify.sanitize(
      `<div class="text-red-400">${t("documentation.error_rendering_markdown")} ${errorMessage}</div>`
    )
  }
})

// Dynamically adjust textarea height to fit content
const adjustTextareaHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto"
    const newHeight = textareaRef.value.scrollHeight + 4
    const minHeight = 208
    textareaHeight.value = Math.max(newHeight, minHeight)
    textareaRef.value.style.height = `${textareaHeight.value}px`
  }
}

// Switch to edit mode and focus the textarea
const enableEditMode = () => {
  // Prevent editing if readOnly is true
  if (props.readOnly) return

  editMode.value = true
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
      adjustTextareaHeight()
    }
  })
}

// Handle blur event - save changes and exit edit mode
const handleBlur = () => {
  emit("update:modelValue", internalContent.value)
  emit("blur")
  editMode.value = false
}

// Watch for content changes to dynamically adjust textarea height
watch(internalContent, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})

// Initialize textarea height when component mounts
onMounted(() => {
  if (editMode.value) {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
})
</script>

<style scoped>
/* Markdown content styles */
.markdown-content :deep(a) {
  @apply text-accent hover:underline;
}

/* Heading styles */
.markdown-content :deep(h1) {
  @apply text-lg font-semibold text-secondaryDark mt-4 mb-2;
}

.markdown-content :deep(h2) {
  @apply text-base font-semibold text-secondaryDark mt-4 mb-2;
}

.markdown-content :deep(h3) {
  @apply text-sm font-medium text-secondaryDark mt-3 mb-2;
}

.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  @apply text-xs font-medium text-secondaryDark mt-2 mb-1;
}

/* Paragraph and text styles */
.markdown-content :deep(p) {
  @apply text-sm my-2 leading-relaxed text-secondary;
}

.markdown-content :deep(strong) {
  @apply font-semibold text-secondaryDark;
}

.markdown-content :deep(em) {
  @apply italic;
}

.markdown-content :deep(del) {
  @apply line-through;
}

/* List styles */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  @apply pl-6 my-3 text-sm text-secondary space-y-1;
}

.markdown-content :deep(li > ul),
.markdown-content :deep(li > ol) {
  @apply my-1 ml-4;
}

.markdown-content :deep(ul) {
  @apply list-disc;
}

.markdown-content :deep(ol) {
  @apply list-decimal;
}

.markdown-content :deep(li) {
  @apply my-1 leading-relaxed;
}

/* Code styles */
.markdown-content :deep(code) {
  @apply bg-primaryLight text-accent px-1.5 py-0.5 rounded font-mono text-xs;
}

.markdown-content :deep(pre) {
  @apply bg-primaryLight p-3 rounded my-3 overflow-auto;
}

.markdown-content :deep(pre code) {
  @apply bg-transparent p-0 text-xs leading-normal block;
}

.markdown-content :deep(blockquote) {
  @apply border-l-4 border-divider pl-4 italic text-secondaryLight my-4 text-sm bg-primaryDark py-2 rounded-r;
}

.markdown-content :deep(hr) {
  @apply my-6 border-none h-px;
}

.markdown-content :deep(table) {
  @apply border-collapse w-full my-4 text-xs;
}

.markdown-content :deep(th) {
  @apply border border-divider px-3 py-2 text-left font-medium text-secondaryDark;
  @apply bg-divider;
}

.markdown-content :deep(td) {
  @apply border border-divider px-3 py-1 text-secondary;
  @apply bg-primaryDark;
}

.markdown-content :deep(thead tr:hover),
.markdown-content :deep(tbody tr:hover) {
  @apply bg-divider;
}

.markdown-content :deep(th:first-child),
.markdown-content :deep(td:first-child) {
  @apply text-xs;
}

.markdown-content :deep(th:nth-child(2)),
.markdown-content :deep(td:nth-child(2)) {
  @apply text-sm;
}

.markdown-content :deep(th:nth-child(3)),
.markdown-content :deep(td:nth-child(3)) {
  @apply text-base;
}

.markdown-content :deep(th:nth-child(4)),
.markdown-content :deep(td:nth-child(4)) {
  @apply text-lg;
}

.markdown-content :deep(th:nth-child(5)),
.markdown-content :deep(td:nth-child(5)) {
  @apply text-xs;
}

.markdown-content :deep(th:last-child),
.markdown-content :deep(td:last-child) {
  @apply pl-4 text-xs;
}
</style>
