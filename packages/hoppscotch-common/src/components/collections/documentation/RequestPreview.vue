<template>
  <div class="p-6 flex-1 overflow-y-auto">
    <div v-if="request" class="space-y-8">
      <div class="flex-col space-y-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <span
              class="px-2 py-1 text-xs font-mono rounded"
              :class="getMethodClass(requestMethod)"
            >
              {{ requestMethod }}
            </span>
            <h1 class="text-2xl font-bold text-secondaryDark">
              {{ requestName }}
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
            {{ getFullEndpoint }}
          </span>
          <span>
            <HoppSmartItem
              :icon="IconCopy"
              @click="copyToClipboard(getFullEndpoint)"
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
              placeholder="Add description for request here..."
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

      <!-- Check performance issue -->
      <CollectionsDocumentationSectionsCurlView
        :request="request"
        :collection-i-d="collectionID"
        :collection-path="collectionPath"
        :folder-path="folderPath"
        :request-index="requestIndex"
        :team-i-d="teamID"
      />

      <CollectionsDocumentationSectionsAuth :auth="request?.auth" />

      <CollectionsDocumentationSectionsHeaders
        :headers="request?.headers || []"
      />

      <CollectionsDocumentationSectionsParameters
        :params="request?.params || []"
      />

      <CollectionsDocumentationSectionsVariables
        :variables="request?.requestVariables || []"
      />

      <CollectionsDocumentationSectionsRequestBody :body="request?.body" />

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
import {
  Environment,
  HoppCollectionVariable,
  HoppRESTRequest,
  makeRESTRequest,
} from "@hoppscotch/data"
import { ref, computed, watch, nextTick, onMounted } from "vue"
import MarkdownIt from "markdown-it"
import IconCopy from "~icons/lucide/copy"
import IconExternalLink from "~icons/lucide/external-link"
import { useToast } from "~/composables/toast"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { DocumentationService } from "~/services/documentation.service"
import { cascadeParentCollectionForProperties } from "~/newstore/collections"
import { cloneDeep } from "lodash-es"
import { getEffectiveRESTRequest } from "~/helpers/utils/EffectiveURL"
import { computedAsync } from "@vueuse/core"
import {
  AggregateEnvironment,
  getCurrentEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
const toast = useToast()

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
})

const props = withDefaults(
  defineProps<{
    documentationDescription?: string
    request?: HoppRESTRequest | null
    collectionID?: string
    collectionPath?: string | null
    folderPath?: string | null
    requestIndex?: number | null
    requestID?: string | null
    teamID?: string
  }>(),
  {
    documentationDescription: "",
    request: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    requestIndex: null,
    requestID: null,
    teamID: undefined,
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
  (event: "close-modal"): void
}>()

const restTabs = useService(RESTTabService)
const teamCollectionsService = useService(TeamCollectionsService)
const documentationService = useService(DocumentationService)

const requestName = computed<string>(() => {
  if (!props.request) return ""
  return props.request.name || "Untitled Request"
})

const requestMethod = computed<string>(() => {
  return props.request?.method || "GET"
})

const requestId = computed<string>(() => {
  if (!props.request) return ""

  return props.request._ref_id || (props.request as any).id || ""
})

const editMode = ref<boolean>(false)
const editableContent = ref<string>(props.documentationDescription)

const currentEnvironmentValueService = useService(CurrentValueService)

const getCurrentValue = (env: AggregateEnvironment) => {
  const currentSelectedEnvironment = getCurrentEnvironment()

  if (env && env.secret) {
    return env.currentValue
  }
  return currentEnvironmentValueService.getEnvironmentByKey(
    env?.sourceEnv !== "Global" ? currentSelectedEnvironment.id : "Global",
    env?.key ?? ""
  )?.currentValue
}

const getEffectiveRequest = async () => {
  if (!props.request) return null

  let collectionVariables: HoppCollectionVariable[] = []

  if (props.teamID && props.folderPath?.split("/")[0]) {
    const inheritedProperties =
      teamCollectionsService.cascadeParentCollectionForProperties(
        props.folderPath?.split("/")[0] || ""
      )

    collectionVariables = inheritedProperties.variables.flatMap((parentVar) =>
      parentVar.inheritedVariables.map((variable) => ({
        key: variable.key,
        initialValue: variable.initialValue,
        currentValue: variable.currentValue,
        secret: variable.secret,
      }))
    )
  } else if (props.folderPath) {
    const inheritedProperties = cascadeParentCollectionForProperties(
      props.folderPath,
      "rest"
    )

    collectionVariables = inheritedProperties.variables.flatMap((parentVar) =>
      parentVar.inheritedVariables.map((variable) => ({
        key: variable.key,
        initialValue: variable.initialValue,
        currentValue: variable.currentValue,
        secret: variable.secret,
      }))
    )
  }

  const requestVariables = (props.request.requestVariables || []).map(
    (requestVariable) => {
      if (requestVariable.active)
        return {
          key: requestVariable.key,
          currentValue: requestVariable.value,
          initialValue: requestVariable.value,
          secret: false,
        }
      return {}
    }
  )

  const env: Environment = {
    v: 2,
    id: "env",
    name: "Env",
    variables: [
      ...(requestVariables as Environment["variables"]),
      ...collectionVariables.map((env) => ({
        ...env,
        currentValue: getCurrentValue(env) || env.initialValue,
      })),
    ],
  }

  const effectiveReq = await getEffectiveRESTRequest(
    makeRESTRequest({
      ...props.request,
    }),
    env,
    true
  )

  return { effectiveRequest: effectiveReq, env }
}

watch(
  () => props.documentationDescription,
  (newContent) => {
    if (!editMode.value) {
      editableContent.value = newContent
    }
  },
  { immediate: true }
)

const renderedMarkdown = computed(() => {
  try {
    const content = editableContent.value || ""
    if (content.trim() === "") {
      return "<p class='text-secondaryLight italic'>Add description for request here...</p>"
    }
    return md.render(content)
  } catch (e) {
    console.error("Markdown parsing error:", e)
    return "<p class='text-red-500'>Error rendering markdown content</p>"
  }
})

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const textareaHeight = ref<number>(200)

function adjustTextareaHeight() {
  if (textareaRef.value) {
    textareaRef.value.style.height = "auto"
    const newHeight = textareaRef.value.scrollHeight + 4
    const minHeight = 208
    textareaHeight.value = Math.max(newHeight, minHeight)
    textareaRef.value.style.height = `${textareaHeight.value}px`
  }
}

function getResponseExamples() {
  if (!props.request) return null

  if (
    props.request.responses &&
    Object.keys(props.request.responses).length > 0
  ) {
    const examples = []

    for (const [name, response] of Object.entries(props.request.responses)) {
      if (response && typeof response === "object") {
        console.log("Processing response for example:", name, response)
        const example = {
          name: name || "Response Example",
          statusCode: (response as any).code || 200,
          headers: (response as any).headers || [],
          body: (response as any).body || "",
          contentType: "application/json",
        }
        examples.push(example)
      }
    }

    return examples.length > 0 ? examples : null
  }

  return null
}

function enableEditMode(): void {
  editMode.value = true

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
      adjustTextareaHeight()
    }
  })
}

function handleBlur(): void {
  // Only store changes in documentation service if there's actually a change
  const hasChanged = editableContent.value !== props.documentationDescription

  // Store changes in documentation service if request ID exists and content changed
  if (hasChanged && requestId.value && props.request) {
    const isTeamRequest = !!props.teamID && props.requestID

    console.log("saving req blur", props.teamID, props.requestID, props.request)

    if (isTeamRequest && props.requestID) {
      documentationService.setRequestDocumentation(
        requestId.value,
        editableContent.value,
        {
          parentCollectionID: props.collectionID,
          isTeamItem: true,
          folderPath: props.folderPath || "",
          requestID: props.requestID,
          teamID: props.teamID,
          requestData: props.request,
        }
      )
    } else if (
      props.folderPath !== null &&
      props.folderPath !== undefined &&
      props.requestIndex !== null &&
      props.requestIndex !== undefined
    ) {
      documentationService.setRequestDocumentation(
        requestId.value,
        editableContent.value,
        {
          parentCollectionID: props.collectionID,
          isTeamItem: false,
          folderPath: props.folderPath,
          requestIndex: props.requestIndex,
          teamID: props.teamID,
          requestData: props.request,
        }
      )
    }
  }

  emit("update:documentationDescription", editableContent.value)
  editMode.value = false
}

watch(editableContent, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})

onMounted(() => {
  if (editMode.value) {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
})

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

const getFullEndpoint = computedAsync(async () => {
  const res = await getEffectiveRequest()

  if (!res) return ""

  const { effectiveRequest } = res

  if (!effectiveRequest) return ""

  const input = effectiveRequest.effectiveFinalURL

  if (!input) {
    return "https://"
  }

  let url = input.trim()

  url = url.replace(/^https?:\s*\/+\s*/i, (match) =>
    match.toLowerCase().startsWith("https") ? "https://" : "http://"
  )

  if (!/^https?:\/\//i.test(url) && !url.startsWith("<<")) {
    const endpoint = url
    const domain = endpoint.split(/[/:#?]+/)[0]

    const isLocalOrIP = /^(localhost|(\d{1,3}\.){3}\d{1,3})$/.test(domain)
    url = (isLocalOrIP ? "http://" : "https://") + endpoint
  }

  return url
})

const copyToClipboard = async (text: string | undefined) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  } catch (err) {
    console.error("Failed to copy text: ", err)
  }
}

const openInNewTab = () => {
  if (props.request) {
    let saveContext = null

    // Determine if this is a team collection or user collection
    const isTeamCollection = props.teamID && props.folderPath

    if (isTeamCollection) {
      saveContext = {
        originLocation: "team-collection" as const,
        requestID: props.requestID || requestId.value || "",
        collectionID: props.folderPath!,
      }

      const possibleTeamTab = restTabs.getTabRefWithSaveContext(saveContext)

      if (possibleTeamTab) {
        restTabs.setActiveTab(possibleTeamTab.value.id)
      } else {
        restTabs.createNewTab({
          type: "request",
          request: cloneDeep(props.request),
          isDirty: false,
          saveContext,
          inheritedProperties:
            teamCollectionsService.cascadeParentCollectionForProperties(
              props.folderPath!
            ),
        })
      }
    } else if (props.folderPath !== null && props.requestIndex !== null) {
      saveContext = {
        originLocation: "user-collection" as const,
        folderPath: props.folderPath,
        requestIndex: props.requestIndex,
        requestRefID: requestId.value,
      }

      const possibleUserTab = restTabs.getTabRefWithSaveContext(saveContext)

      if (possibleUserTab) {
        restTabs.setActiveTab(possibleUserTab.value.id)
      } else {
        restTabs.createNewTab({
          type: "request",
          request: cloneDeep(props.request),
          isDirty: false,
          saveContext,
          inheritedProperties: cascadeParentCollectionForProperties(
            props.folderPath,
            "rest"
          ),
        })
      }
    } else {
      // Fallback: create a new tab without save context
      console.warn(
        "Unable to determine collection type, creating tab without save context"
      )
      restTabs.createNewTab({
        type: "request",
        request: cloneDeep(props.request),
        isDirty: false,
        saveContext: undefined,
        inheritedProperties: undefined,
      })
    }

    emit("close-modal")
    toast.success("Request opened in new tab!")
  }
}
</script>

<style scoped>
.markdown-content :deep(a) {
  @apply hover:underline;
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
