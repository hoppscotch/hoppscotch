<template>
  <div class="flex flex-1 flex-col overflow-auto whitespace-nowrap">
    <GqlResponseMeta :response="response" :tab-id="tabId" />
    <div
      v-if="
        response && response.length === 1 && response[0].type === 'response'
      "
      class="flex flex-1 flex-col"
    >
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("response.title") }}
        </label>
        <div class="flex items-center">
          <HoppButtonSecondary
            v-if="document"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('response.save_as_example')"
            :icon="IconSave"
            @click="onSaveAsExampleClick"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': WRAP_LINES }"
            :icon="IconWrapText"
            @click.prevent="
              toggleNestedSetting('WRAP_LINES', 'graphqlResponseBody')
            "
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.download_file'
            )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
            :icon="downloadIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.copy'
            )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
            :icon="copyIcon"
            @click="copyResponse"
          />
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => copyInterfaceTippyActions.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              :icon="IconMore"
            />
            <template #content="{ hide }">
              <div
                ref="copyInterfaceTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  :label="t('response.generate_data_schema')"
                  :icon="IconNetwork"
                  @click="
                    () => {
                      invokeAction('response.schema.toggle')
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </div>
      </div>
      <div class="h-full relative overflow-auto flex flex-col flex-1">
        <div ref="schemaEditor" class="absolute inset-0 h-full"></div>
      </div>
    </div>
    <component
      :is="response[0].error.component"
      v-else-if="
        response && response[0].type === 'error' && response[0].error.component
      "
      class="flex-1"
    />
    <div
      v-else-if="response && response?.length > 1"
      class="flex flex-1 flex-col"
    >
      <GqlSubscriptionLog :log="response" />
    </div>
  </div>
  <HttpSaveResponseName
    v-model:response-name="responseName"
    :has-same-name-response="hasSameNameResponse"
    :show="showSaveResponseName"
    @submit="onSaveAsExample"
    @hide-modal="showSaveResponseName = false"
  />
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconNetwork from "~icons/lucide/network"
import IconMore from "~icons/lucide/more-horizontal"
import IconSave from "~icons/lucide/save"
import { computed, reactive, ref } from "vue"
import { useVModel } from "@vueuse/core"
import {
  HoppGQLRequestResponse,
  HoppGQLResponseOriginalRequest,
  makeHoppGQLResponseOriginalRequest,
} from "@hoppscotch/data"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { GQLResponseEvent } from "~/services/gql-tab-connection.service"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import { editRESTRequest } from "~/newstore/collections"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    response: GQLResponseEvent[] | null
    tabId?: string
    document?: HoppGQLRequestDocument
  }>(),
  {
    response: null,
    tabId: undefined,
    document: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:document", val: HoppGQLRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)

const responseString = computed(() => {
  const response = props.response
  if (response && response[0].type === "error") {
    return ""
  } else if (
    response &&
    response.length === 1 &&
    response[0].type === "response" &&
    response[0].data
  ) {
    return JSON.stringify(JSON.parse(response[0].data), null, 2)
  }
  return ""
})

const schemaEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "graphqlResponseBody")
const copyInterfaceTippyActions = ref<any | null>(null)

useCodemirror(
  schemaEditor,
  responseString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const { copyIcon, copyResponse } = useCopyResponse(responseString)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  responseString,
  t("filename.graphql_response")
)

defineActionHandler(
  "response.file.download",
  () => downloadResponse(),
  computed(() => !!props.response && props.response.length > 0)
)
defineActionHandler(
  "response.copy",
  () => copyResponse(),
  computed(() => !!props.response && props.response.length > 0)
)

const responseName = ref("")
const showSaveResponseName = ref(false)

const hasSameNameResponse = computed(() => {
  if (!responseName.value || !doc.value) return false
  return responseName.value in doc.value.request.responses
})

const onSaveAsExampleClick = () => {
  if (!doc.value) return
  showSaveResponseName.value = true
  responseName.value = doc.value.request.name
}

const onSaveAsExample = () => {
  if (!doc.value || !props.response || props.response.length !== 1) return

  const event = props.response[0]
  if (event.type !== "response") return

  const req = doc.value.request

  const originalRequest: HoppGQLResponseOriginalRequest =
    makeHoppGQLResponseOriginalRequest({
      name: req.name,
      url: req.url,
      query: req.query,
      variables: req.variables,
      headers: req.headers,
      auth: req.auth,
    })

  const resName = responseName.value.trim()

  const responseObj: HoppGQLRequestResponse = {
    name: resName,
    originalRequest,
    status: event.document?.statusText ?? "",
    code: event.document?.statusCode ?? null,
    // GQL response transport headers are not currently surfaced by the
    // tab-connection service; persist an empty list. If the service later
    // exposes them, this is where they'd land.
    headers: [],
    body: event.data,
  }

  doc.value.request.responses = {
    ...doc.value.request.responses,
    [resName]: responseObj,
  }

  showSaveResponseName.value = false

  const saveCtx = doc.value.saveContext
  if (!saveCtx) {
    responseName.value = ""
    return
  }

  // Unified workspace: GQL request bodies are stored in REST collection rows,
  // so personal-workspace saves go through the REST store / REST mutation
  // (mirrors `editRequest` in the personal sync layer).
  if (saveCtx.originLocation === "user-collection") {
    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        doc.value.request
      )
      toast.success(`${t("response.saved")}`)
    } catch (e) {
      console.error(e)
    }
    responseName.value = ""
    return
  }

  if (saveCtx.originLocation === "team-collection") {
    runMutation(UpdateRequestDocument, {
      requestID: saveCtx.requestID,
      data: {
        title: doc.value.request.name,
        request: JSON.stringify(doc.value.request),
      },
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(`${t("profile.no_permission")}`)
      } else {
        toast.success(`${t("response.saved")}`)
      }
      responseName.value = ""
    })
    return
  }

  responseName.value = ""
}
</script>
