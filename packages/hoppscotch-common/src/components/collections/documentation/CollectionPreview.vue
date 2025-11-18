<template>
  <div class="p-6 flex-1 overflow-y-auto">
    <div
      v-if="collection"
      class="flex-1 min-w-0 flex flex-col space-y-8 overflow-y-auto"
    >
      <div class="px-4">
        <span
          v-if="collection.id"
          class="text-xs text-secondaryLight bg-primaryDark inline-flex py-1 px-1.5 rounded-xl border border-divider shadow-sm"
        >
          {{ collection.id }}
        </span>
        <h1 class="text-3xl font-bold text-secondaryDark my-2">
          {{ collectionName }}
        </h1>
      </div>

      <!-- Collection Documentation -->
      <div class="">
        <div class="rounded-sm relative h-full" @click.stop>
          <!-- Edit mode textarea -->
          <template v-if="editMode">
            <textarea
              ref="textareaRef"
              v-model="editableContent"
              class="text-wrap w-full p-4 rounded-sm text-sm font-mono text-secondaryLight outline-none resize-none focus:border focus:border-accent focus:bg-primaryLight transition"
              :style="{ height: textareaHeight + 'px' }"
              spellcheck="false"
              placeholder="Add description for this collection here..."
              @blur="handleBlur"
              @click.stop
              @input="adjustTextareaHeight"
            ></textarea>
          </template>

          <!-- Preview mode with rendered markdown -->
          <div
            v-else
            class="cursor-text min-h-52 p-4 prose prose-invert prose-sm max-w-none markdown-content relative hover:bg-primaryLight transition border border-transparent rounded-sm"
            @click.stop="enableEditMode"
            v-html="renderedMarkdown"
          ></div>
        </div>
      </div>

      <CollectionsDocumentationSectionsAuth :auth="collectionAuth" />

      <CollectionsDocumentationSectionsVariables
        :variables="collectionVariables"
      />

      <CollectionsDocumentationSectionsHeaders :headers="collectionHeaders" />
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-question class="mx-auto mb-2" size="32" />
      <p>No collection data available</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppCollectionVariable,
} from "@hoppscotch/data"
import { ref, computed, watch, nextTick, onMounted } from "vue"
import MarkdownIt from "markdown-it"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { DocumentationService } from "~/services/documentation.service"
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

type CollectionType = HoppCollection | null

const props = withDefaults(
  defineProps<{
    documentationDescription: string
    collection: CollectionType
    pathOrID: string | null
    folderPath?: string
    isTeamCollection?: boolean
    collectionPath?: string
    teamID?: string
  }>(),
  {
    documentationDescription: "",
    collection: null,
    pathOrID: null,
    folderPath: "",
    isTeamCollection: false,
    collectionPath: "",
    teamID: "",
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
}>()

// Extract collection name with fallback for null collections
const collectionName = computed<string>(() => {
  if (!props.collection) return ""
  return props.collection.name
})

// Extract collection auth configuration with inherit default
const collectionAuth = computed<HoppRESTAuth | null>(() => {
  if (!props.collection) return null
  return props.collection.auth || { authType: "inherit", authActive: true }
})

// Extract collection variables with empty array fallback
const collectionVariables = computed<HoppCollectionVariable[]>(() => {
  if (!props.collection) return []
  return props.collection.variables || []
})

// Extract collection headers with empty array fallback
const collectionHeaders = computed<HoppRESTHeaders>(() => {
  if (!props.collection) return []
  return props.collection.headers || []
})

const collectionDescription = useVModel(
  props,
  "documentationDescription",
  emit,
  { passive: true }
)

const documentationService = useService(DocumentationService)

// Edit mode state and content management
const editMode = ref<boolean>(false)
const editableContent = ref<string>(collectionDescription.value)

// Sync collection description with editable content when not in edit mode
watch(
  () => collectionDescription.value,
  (newContent) => {
    if (!editMode.value) {
      editableContent.value = newContent
    }
  },
  { immediate: true }
)

const renderedMarkdown = computed(() => {
  try {
    // Show placeholder if content is empty or only whitespace
    if (!editableContent.value || editableContent.value.trim() === "") {
      return "<p class='text-secondaryLight italic'>Add description for this collection here...</p>"
    }
    return md.render(editableContent.value)
  } catch (e) {
    console.error("Markdown parsing error:", e)
    return "<p class='text-red-500'>Error rendering markdown content</p>"
  }
})

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const textareaHeight = ref<number>(200)

// Dynamically adjust textarea height to fit content
function adjustTextareaHeight() {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto"
    const newHeight = textareaRef.value.scrollHeight + 4
    const minHeight = 208
    textareaHeight.value = Math.max(newHeight, minHeight)
    textareaRef.value.style.height = `${textareaHeight.value}px`
  }
}

// Switch to edit mode and focus the textarea
function enableEditMode(): void {
  editMode.value = true
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
      adjustTextareaHeight()
    }
  })
}

// Handle blur event save changes and exit edit mode
function handleBlur(): void {
  // Check if content has changed
  const hasChanged = editableContent.value !== collectionDescription.value

  if (hasChanged && (props.collection?.id || props.collection?._ref_id)) {
    documentationService.setCollectionDocumentation(
      props.collection.id ?? props.collection._ref_id!,
      editableContent.value,
      {
        isTeamItem: props.isTeamCollection,
        pathOrID: props.pathOrID ?? props.folderPath,
        teamID: props.teamID,
        collectionData: props.collection as HoppCollection,
      }
    )
  }

  emit("update:documentationDescription", editableContent.value)
  editMode.value = false
}

// Watch for content changes to dynamically adjust textarea height
watch(editableContent, () => {
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
/* Markdown content styling with proper font sizes */
.markdown-content :deep(a) {
  @apply text-accent hover:underline;
}

/* Heading styles with proper font sizes */
.markdown-content :deep(h1) {
  @apply text-xl font-semibold text-secondaryDark mt-6 mb-4;
}

.markdown-content :deep(h2) {
  @apply text-lg font-semibold text-secondaryDark mt-5 mb-3;
}

.markdown-content :deep(h3) {
  @apply text-base font-medium text-secondaryDark mt-4 mb-2;
}

.markdown-content :deep(h4) {
  @apply text-sm font-medium text-secondaryDark mt-3 mb-2;
}

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
  @apply pl-6 my-3 text-sm text-secondaryLight space-y-1;
}

/* Nested list styling */
.markdown-content :deep(li > ul),
.markdown-content :deep(li > ol) {
  @apply my-1 ml-4;
}

.markdown-content :deep(li) {
  @apply my-1 leading-relaxed;
}

.markdown-content :deep(ul) {
  @apply list-disc;
}

.markdown-content :deep(ol) {
  @apply list-decimal;
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

/* Code syntax highlighting for different languages */
.markdown-content :deep(pre.language-json) {
  @apply border-l-2 border-blue-500;
}

.markdown-content :deep(pre.language-javascript),
.markdown-content :deep(pre.language-js) {
  @apply border-l-2 border-yellow-500;
}

.markdown-content :deep(pre.language-typescript),
.markdown-content :deep(pre.language-ts) {
  @apply border-l-2 border-blue-400;
}

.markdown-content :deep(pre.language-bash),
.markdown-content :deep(pre.language-sh) {
  @apply border-l-2 border-green-400;
}

.markdown-content :deep(pre.language-html),
.markdown-content :deep(pre.language-xml) {
  @apply border-l-2 border-orange-400;
}

.markdown-content :deep(pre.language-css) {
  @apply border-l-2 border-purple-400;
}

/* Blockquote styles */
.markdown-content :deep(blockquote) {
  @apply border-l-4 border-divider pl-4 italic text-secondaryLight my-4 text-sm bg-primaryDark py-2 rounded-r;
}

/* Horizontal rule with gradient */
.markdown-content :deep(hr) {
  @apply my-6 border-none h-px;
  background: linear-gradient(
    to right,
    transparent,
    var(--divider-color),
    transparent
  );
}

/* Table styles */
.markdown-content :deep(table) {
  @apply border-collapse w-full my-4 text-xs;
  border-spacing: 0;
}

.markdown-content :deep(thead tr) {
  @apply bg-divider;
}

.markdown-content :deep(tbody tr:nth-child(odd)) {
  @apply bg-primaryDark;
}

.markdown-content :deep(th) {
  @apply border border-divider px-3 py-2 text-left font-medium text-secondaryDark;
}

.markdown-content :deep(td) {
  @apply border border-divider px-3 py-1 text-secondaryLight;
}

/* Mobile responsiveness for markdown */
@media (max-width: 640px) {
  .markdown-content :deep(pre),
  .markdown-content :deep(table) {
    @apply text-xs;
  }

  .markdown-content :deep(h1) {
    @apply text-lg;
  }

  .markdown-content :deep(h2) {
    @apply text-base;
  }

  .markdown-content :deep(h3),
  .markdown-content :deep(h4),
  .markdown-content :deep(h5),
  .markdown-content :deep(h6) {
    @apply text-sm;
  }

  .markdown-content :deep(p) {
    @apply text-xs;
  }

  .markdown-content :deep(ul),
  .markdown-content :deep(ol) {
    @apply pl-4 text-xs;
  }
}
</style>
