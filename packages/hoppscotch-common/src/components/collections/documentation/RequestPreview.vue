<template>
  <div class="p-6 flex-1 overflow-y-auto">
    <div v-if="request" class="space-y-8">
      <div class="flex-col space-y-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <span
              class="px-2 py-1 text-xs font-mono rounded"
              :class="getMethodClass(request.method)"
            >
              {{ request.method }}
            </span>
            <h1 class="text-2xl font-bold text-secondaryDark">
              {{ request.name }}
            </h1>
          </div>
          <HoppSmartItem
            :icon="IconExternalLink"
            title="Open request in new tab"
            @click="openInNewTab"
          />
        </div>
        <div
          class="text-secondaryLight text-sm break-all bg-primaryLight py-1 pl-2 rounded-md flex justify-between items-center"
        >
          <span>
            {{ getFullEndpoint() }}
          </span>
          <span>
            <HoppSmartItem
              :icon="IconCopy"
              @click="copyToClipboard(getFullEndpoint())"
            />
          </span>
        </div>
      </div>

      <div class="">
        <div class="rounded-sm relative h-full" @click.stop>
          <!-- Edit mode with textarea -->
          <template v-if="editMode">
            <textarea
              ref="textareaRef"
              v-model="editableContent"
              class="text-wrap w-full p-4 rounded-sm text-sm font-mono text-secondaryLight outline-none resize-none focus:border focus:border-accent focus:bg-primaryLight transition"
              :style="{ height: textareaHeight + 'px' }"
              spellcheck="false"
              placeholder="Enter markdown documentation for this collection..."
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

      <!-- cURL Command Section -->
      <div class="space-y-2">
        <div class="rounded-md border border-divider overflow-hidden">
          <div
            class="flex items-center justify-between p-2 bg-divider/30 border-b border-divider"
          >
            <div
              class="text-sm font-medium text-secondaryDark flex items-center"
            >
              <icon-lucide-terminal class="mr-2" size="14" />
              cURL
            </div>
            <div class="flex items-center space-x-2">
              <div>
                <tippy
                  interactive
                  trigger="click"
                  theme="popover"
                  placement="bottom"
                  :on-shown="() => tippyActions?.focus()"
                >
                  <HoppSmartSelectWrapper>
                    <HoppButtonSecondary
                      :label="
                        CodegenDefinitions.find((x) => x.name === codegenType)!
                          .caption
                      "
                      outline
                      class="flex-1 pr-8"
                    />
                  </HoppSmartSelectWrapper>
                  <template #content="{ hide }">
                    <div class="flex flex-col space-y-2">
                      <div
                        class="sticky top-0 z-10 flex-shrink-0 overflow-x-auto"
                      >
                        <input
                          v-model="searchQuery"
                          type="search"
                          autocomplete="off"
                          class="input flex w-full !bg-primaryContrast p-4 py-2"
                          :placeholder="`${t('action.search')}`"
                        />
                      </div>
                      <div
                        ref="tippyActions"
                        class="flex flex-col focus:outline-none"
                        tabindex="0"
                        @keyup.escape="hide()"
                      >
                        <HoppSmartItem
                          v-for="codegen in filteredCodegenDefinitions"
                          :key="codegen.name"
                          :label="codegen.caption"
                          :info-icon="
                            codegen.name === codegenType ? IconCheck : undefined
                          "
                          :active-info-icon="codegen.name === codegenType"
                          @click="
                            () => {
                              codegenType = codegen.name
                              codegenMode = codegen.lang
                              hide()
                            }
                          "
                        />
                        <HoppSmartPlaceholder
                          v-if="filteredCodegenDefinitions.length === 0"
                          :text="`${t('state.nothing_found')} ‟${searchQuery}”`"
                        >
                          <template #icon>
                            <icon-lucide-search class="svg-icons opacity-75" />
                          </template>
                        </HoppSmartPlaceholder>
                      </div>
                    </div>
                  </template>
                </tippy>
              </div>
              <div class="flex space-x-2">
                <HoppSmartItem
                  :icon="curlCopied ? IconCheck : IconCopy"
                  title="Copy to clipboard"
                  @click="copyCurlCommand"
                />
              </div>
            </div>
          </div>

          <div ref="curlCodeMirrorContainer" class="curl-editor h-auto"></div>
        </div>
      </div>

      <CollectionsDocumentationSectionsAuth :auth="request.auth" />

      <CollectionsDocumentationSectionsHeaders :headers="request.headers" />

      <CollectionsDocumentationSectionsParameters :params="request.params" />

      <CollectionsDocumentationSectionsVariables
        :variables="request.requestVariables"
      />

      <CollectionsDocumentationSectionsPreRequestScript
        :pre-request-script="request.preRequestScript"
      />

      <CollectionsDocumentationSectionsTestScript
        :test-script="request.testScript"
      />

      <CollectionsDocumentationSectionsRequestBody :body="request.body" />

      <CollectionsDocumentationSectionsResponse
        :response-examples="getResponseExamples()"
      />
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-question class="mx-auto mb-2" size="32" />
      <p>No request data available</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTRequest, makeRESTRequest } from "@hoppscotch/data"
import { ref, computed, watch, reactive, nextTick, onMounted } from "vue"
import MarkdownIt from "markdown-it"
import { useCodemirror } from "@composables/codemirror"
import { useNestedSetting } from "~/composables/settings"
import {
  CodegenDefinitions,
  CodegenLang,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconExternalLink from "~icons/lucide/external-link"
import { useI18n } from "~/composables/i18n"
import * as O from "fp-ts/Option"
import { useToast } from "~/composables/toast"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { cascadeParentCollectionForProperties } from "~/newstore/collections"
import { cloneDeep } from "lodash-es"

const t = useI18n()
const toast = useToast()

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

const props = withDefaults(
  defineProps<{
    documentationDescription: string
    request: HoppRESTRequest | null
    collectionID?: string
    collectionPath?: string | null
    folderPath?: string | null
    requestIndex?: number | null
    teamID?: string
  }>(),
  {
    documentationDescription: "",
    request: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    requestIndex: null,
    teamID: undefined,
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
  (event: "close-modal"): void
}>()

const editMode = ref<boolean>(false)
const editableContent = ref<string>(props.documentationDescription)

const curlCodeMirrorContainer = ref<HTMLElement | null>(null)
const curlCopied = ref<boolean>(false)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "codeGen")
const codegenType = ref<CodegenName>("shell-curl")
const codegenMode = ref<CodegenLang>("shell")

const tippyActions = ref<HTMLElement | null>(null)

const searchQuery = ref("")

const filteredCodegenDefinitions = computed(() => {
  return CodegenDefinitions.filter((obj) =>
    Object.values(obj).some((val) =>
      val.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})

// Generate cURL command from request
const curlCommand = computed((): string => {
  if (!props.request) return "# No request data available"

  const lang = codegenType.value

  const result = generateCode(
    lang,
    makeRESTRequest({
      ...props.request,
    })
  )

  if (O.isSome(result)) {
    return result.value
  }
  return ""
})

useCodemirror(
  curlCodeMirrorContainer,
  curlCommand,
  reactive({
    extendedEditorConfig: {
      mode: "shell",
      readOnly: true,
      lineWrapping: WRAP_LINES,
      theme: "material",
      lineNumbers: false,
      viewportMargin: Infinity,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

watch(
  () => props.documentationDescription,
  (newContent) => {
    if (!editMode.value) {
      editableContent.value = newContent
    }

    console.log("Updated editableContent:", newContent)

    if (newContent.trim() === "") {
      console.log("Setting default content")
      editableContent.value =
        "Enter markdown documentation for this collection..."
    }
  },
  { immediate: true }
)

// Use MarkdownIt to render markdown
const renderedMarkdown = computed(() => {
  try {
    // Use MarkdownIt to parse markdown to HTML
    return md.render(editableContent.value || "")
  } catch (e) {
    console.error("Markdown parsing error:", e)
    return "<p class='text-red-500'>Error rendering markdown content</p>"
  }
})

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const textareaHeight = ref<number>(200) // Default height

// Function to adjust textarea height
function adjustTextareaHeight() {
  if (textareaRef.value) {
    // Reset height to auto to get the correct scrollHeight
    textareaRef.value.style.height = "auto"

    // Calculate new height (scrollHeight + small buffer for better appearance)
    const newHeight = textareaRef.value.scrollHeight + 4

    // Set minimum height (52px matches your min-h-52 class)
    const minHeight = 208 // equivalent to min-h-52

    // Update height (use the larger of calculated height or minimum height)
    textareaHeight.value = Math.max(newHeight, minHeight)

    // Update textarea height
    textareaRef.value.style.height = `${textareaHeight.value}px`
  }
}

/**
 * Extract response examples from the request data
 * This function safely handles the fact that HoppRESTRequest doesn't have responseExamples by default
 * but may have responses data that can be converted to examples
 */
function getResponseExamples() {
  if (!props.request) return null

  // Check if there are any saved responses that can be used as examples
  if (
    props.request.responses &&
    Object.keys(props.request.responses).length > 0
  ) {
    const examples = []

    // Convert saved responses to example format
    for (const [name, response] of Object.entries(props.request.responses)) {
      if (response && typeof response === "object") {
        console.log("Processing response for example:", name, response)
        const example = {
          name: name || "Response Example",
          statusCode: response.code || 200,
          headers: response.headers || [],
          body: response.body || "",
          contentType: "application/json",
        }
        examples.push(example)
      }
    }

    return examples.length > 0 ? examples : null
  }

  // For now, return null if no response examples are available
  // In the future, this could be extended to support a responseExamples field
  return null
}

// Enable edit mode and focus the textarea
function enableEditMode(): void {
  editMode.value = true

  // After Vue updates the DOM
  nextTick(() => {
    if (textareaRef.value) {
      // Focus textarea
      textareaRef.value.focus()

      // Adjust height to match content
      adjustTextareaHeight()
    }
  })
}

// Handle blur event (when clicking outside or tabbing away)
function handleBlur(): void {
  // Save changes when exiting edit mode
  emit("update:documentationDescription", editableContent.value)
  editMode.value = false
}

// Watch for content changes to adjust height
watch(editableContent, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})

// Initialize height when component mounts
onMounted(() => {
  // Adjust height on initial render if in edit mode
  if (editMode.value) {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
})

/**
 * Returns the appropriate CSS class for styling the request method badge
 * @param method The HTTP method
 * @returns CSS class string for the method badge
 */
function getMethodClass(method: string): string {
  const methodLower: string = method?.toLowerCase() || ""

  switch (methodLower) {
    case "get":
      return "bg-green-500/20 text-green-500"
    case "post":
      return "bg-blue-500/20 text-blue-500"
    case "put":
      return "bg-orange-500/20 text-orange-500"
    case "delete":
      return "bg-red-500/20 text-red-500"
    case "patch":
      return "bg-teal-500/20 text-teal-500"
    default:
      return "bg-secondaryLight/20 text-secondaryLight"
  }
}

/**
 * Builds a full endpoint URL with base path if available
 * @returns Formatted endpoint URL
 */
function getFullEndpoint(): string {
  if (!props.request) return ""

  const basePath = props.request.basePath || ""
  const endpoint = props.request.endpoint || ""

  if (basePath && !endpoint.startsWith("http")) {
    return `${basePath}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  }

  return endpoint
}

/**
 * Format JSON string for display
 * @param jsonString String to format
 * @returns Formatted JSON string
 */
// function formatJSON(jsonString: string): string {
//   try {
//     const parsed = JSON.parse(jsonString || "{}")
//     return JSON.stringify(parsed, null, 2)
//   } catch (e) {
//     return jsonString || ""
//   }
// }

/**
 * Parse form data into key-value pairs
 * @param formData Form data string
 * @returns Array of key-value pairs
 */
// function parseFormData(formData: string): { key: string; value: string }[] {
//   try {
//     const result: { key: string; value: string }[] = []
//     const pairs = formData.split("&")

//     pairs.forEach((pair) => {
//       const [key, value] = pair.split("=")
//       if (key) {
//         result.push({
//           key: decodeURIComponent(key),
//           value: decodeURIComponent(value || ""),
//         })
//       }
//     })

//     return result
//   } catch (e) {
//     return []
//   }
// }

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  } catch (err) {
    console.error("Failed to copy text: ", err)
  }
}

const copyCurlCommand = async () => {
  try {
    await navigator.clipboard.writeText(curlCommand.value)
    curlCopied.value = true
    setTimeout(() => {
      curlCopied.value = false
    }, 2000)
    toast.success("cURL command copied to clipboard!")
  } catch (err) {
    console.error("Failed to copy cURL command: ", err)
  }
}

// Get services
const restTabs = useService(RESTTabService)
const teamCollectionsService = useService(TeamCollectionsService)

const openInNewTab = () => {
  console.log("Opening request in new tab...", props)
  if (props.request) {
    let saveContext = null
    let inheritedProperties = null

    if (props.collectionID && props.teamID) {
      saveContext = {
        originLocation: "team-collection" as const,
        requestID: props.request._ref_id || "",
        teamID: props.teamID,
        collectionID: props.collectionID,
      }

      inheritedProperties =
        teamCollectionsService.cascadeParentCollectionForProperties(
          props.collectionID
        )
    } else if (props.folderPath !== null && props.requestIndex !== null) {
      saveContext = {
        originLocation: "user-collection" as const,
        folderPath: props.folderPath,
        requestIndex: props.requestIndex,
        requestRefID: props.request._ref_id,
      }

      inheritedProperties = cascadeParentCollectionForProperties(
        props.folderPath,
        "rest"
      )
    }

    console.log("inheritedProperties:", inheritedProperties)
    console.log("saveContext:", saveContext)

    const possibleTab = restTabs.getTabRefWithSaveContext({
      originLocation: "user-collection",
      requestIndex: props.requestIndex!,
      folderPath: props.folderPath!,
    })

    if (possibleTab) {
      restTabs.setActiveTab(possibleTab.value.id)
    } else {
      restTabs.createNewTab({
        type: "request",
        request: cloneDeep(props.request),
        isDirty: false,
        saveContext: {
          originLocation: "user-collection",
          folderPath: props.folderPath!,
          requestIndex: props.requestIndex!,
          requestRefID: props.request._ref_id ?? props.request.id,
        },
        inheritedProperties: cascadeParentCollectionForProperties(
          props.folderPath!,
          "rest"
        ),
      })
    }

    emit("close-modal")

    toast.success("Request opened in new tab!")
  }
}
</script>

<style scoped>
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
  @apply text-sm my-2 leading-relaxed text-secondaryLight;
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

/* Blockquote styles */
.markdown-content :deep(blockquote) {
  @apply border-l-4 border-divider pl-4 italic text-secondaryLight my-4 text-sm bg-primaryDark py-2 rounded-r;
}

/* Horizontal rule */
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

/* CodeMirror customization */
:deep(.curl-code-mirror) {
  @apply bg-primaryDark font-mono text-sm;
  border: none;
}

:deep(.curl-code-mirror .CodeMirror) {
  height: auto;
  max-height: 200px;
  @apply bg-primaryLight;
}

:deep(.curl-code-mirror .CodeMirror-scroll) {
  min-height: 60px;
  max-height: 200px;
}

:deep(.curl-code-mirror .cm-string) {
  @apply text-green-400;
}

:deep(.curl-code-mirror .cm-variable) {
  @apply text-accent;
}

:deep(.curl-code-mirror .cm-comment) {
  @apply text-gray-400;
}

:deep(.curl-code-mirror .cm-attribute) {
  @apply text-orange-400;
}

:deep(.curl-code-mirror .CodeMirror-gutters) {
  @apply bg-primaryDark border-r border-divider;
}

/* Auto-resizing textarea */
.auto-resize-textarea {
  min-height: 100px;
  overflow-y: hidden;
}

/* Make textarea match its content height */
textarea {
  box-sizing: border-box;
  border: 1px solid transparent;
}
</style>
