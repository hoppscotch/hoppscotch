<template>
  <div class="flex-1 overflow-y-auto">
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
            :title="t('documentation.open_request_in_new_tab')"
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
        <CollectionsDocumentationMarkdownEditor
          v-model="editableContent"
          :placeholder="t('documentation.add_request_description')"
          :read-only="readOnly"
          @blur="handleBlur"
        />
      </div>

      <!-- Check performance issue -->
      <CollectionsDocumentationSectionsCurlView
        :request="request"
        :collection-i-d="collectionID"
        :collection-path="collectionPath"
        :folder-path="folderPath"
        :request-index="requestIndex"
        :team-i-d="teamID"
        :inherited-properties="inheritedProperties"
      />

      <CollectionsDocumentationSectionsAuth
        :auth="request?.auth"
        :inherited-auth="inheritedProperties?.auth"
      />

      <CollectionsDocumentationSectionsHeaders
        :headers="request?.headers || []"
        :inherited-headers="inheritedProperties?.headers"
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
      <p>{{ t("documentation.no_request_data") }}</p>
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
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { ref, computed, watch } from "vue"
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
import { useI18n } from "~/composables/i18n"
import { platform } from "~/platform"

const t = useI18n()

const toast = useToast()

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
    readOnly?: boolean
    inheritedProperties?: HoppInheritedProperty
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
    readOnly: false,
    inheritedProperties: undefined,
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
  return props.request.name || t("documentation.untitled_request")
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

const inheritedProperties = computed(() => {
  if (props.inheritedProperties) return props.inheritedProperties

  if (props.teamID && props.folderPath) {
    return teamCollectionsService.cascadeParentCollectionForProperties(
      props.folderPath.split("/")[0]
    )
  }

  if (props.folderPath) {
    return cascadeParentCollectionForProperties(props.folderPath, "rest")
  }

  return undefined
})

const getEffectiveRequest = async () => {
  if (!props.request) return null

  let collectionVariables: HoppCollectionVariable[] = []

  if (inheritedProperties.value) {
    collectionVariables = inheritedProperties.value.variables.flatMap(
      (v) => v.inheritedVariables
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
      ...collectionVariables.map((e) => ({
        ...e,
        currentValue:
          getCurrentValue({
            ...e,
            sourceEnv: "CollectionVariables",
          }) || e.initialValue,
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

function getResponseExamples() {
  if (!props.request) return null

  if (
    props.request.responses &&
    Object.keys(props.request.responses).length > 0
  ) {
    const examples = []

    for (const [name, response] of Object.entries(props.request.responses)) {
      if (response && typeof response === "object") {
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

  return null
}

function handleBlur(): void {
  // Only store changes in documentation service if there's actually a change
  const hasChanged = editableContent.value !== props.documentationDescription

  // Store changes in documentation service if request ID exists and content changed
  if (hasChanged && requestId.value && props.request) {
    const isTeamRequest = !!props.teamID && props.requestID

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
}

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
    toast.success(t("documentation.copied_to_clipboard"))
  } catch (err) {
    console.error("Failed to copy text: ", err)
  }
}

const openInNewTab = () => {
  if (props.request) {
    // If in read-only mode (published documentation), open external link
    // for now open hoppscotch.io, we can pass the request to be opened in the future
    if (props.readOnly) {
      platform.kernelIO.openExternalLink({ url: "https://hoppscotch.io" })
      return
    }

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
    toast.success(t("documentation.request_opened_in_new_tab"))
  }
}
</script>

<style scoped>
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
