<template>
  <div
    class="sticky top-0 z-10 flex flex-shrink-0 space-x-2 overflow-x-auto bg-primary p-4"
  >
    <div class="inline-flex flex-1 space-x-2">
      <div
        class="flex flex-1 whitespace-nowrap rounded border border-divider bg-primaryLight"
      >
        <SmartEnvInput
          v-model="url"
          :placeholder="`${t('graphql.url_placeholder')}`"
          :auto-complete-env="true"
          :inspection-results="urlResults"
          @enter="runQuery"
        />
      </div>
      <HoppButtonPrimary
        id="connect"
        v-tippy="{ theme: 'tooltip' }"
        :title="!connected ? t('action.connect') : t('action.disconnect')"
        :label="!connected ? t('action.connect') : t('action.disconnect')"
        :loading="tabCtx?.state === 'CONNECTING'"
        filled
        outline
        @click="onConnectClick"
      />
      <span class="flex rounded border border-divider transition">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t(
            'request.save'
          )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
          :label="COLUMN_LAYOUT ? `${t('request.save')}` : ''"
          filled
          :icon="IconSave"
          class="rounded rounded-r-none"
          @click="saveRequest()"
        />
        <span class="flex">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => saveTippyActions.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('app.options')"
              :icon="IconChevronDown"
              filled
              class="rounded rounded-l-none"
            />
            <template #content="{ hide }">
              <div
                ref="saveTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  :label="`${t('request.save_as')}`"
                  :icon="IconFolderPlus"
                  @click="
                    () => {
                      showSaveRequestModal = true
                      hide()
                    }
                  "
                />
                <hr />
                <HoppSmartItem
                  :label="t('request.share_request')"
                  :icon="IconShare2"
                  @click="
                    () => {
                      shareRequest()
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </span>
      </span>
    </div>
  </div>
  <CollectionsSaveRequest
    v-if="showSaveRequestModal"
    mode="rest"
    :show="showSaveRequestModal"
    @hide-modal="showSaveRequestModal = false"
  />
</template>

<script setup lang="ts">
import { platform } from "~/platform"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { computed, ref, watch } from "vue"
import { useVModel } from "@vueuse/core"
import * as E from "fp-ts/Either"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { InspectionService } from "~/services/inspection"
import { useService } from "dioc/vue"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { HoppGQLAuth, HoppGQLRequest } from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { editRESTRequest } from "~/newstore/collections"
import { updateTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import IconSave from "~icons/lucide/save"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconShare2 from "~icons/lucide/share-2"
import { useSetting } from "~/composables/settings"

const t = useI18n()
const toast = useToast()

const interceptorService = useService(KernelInterceptorService)
const gqlTabConn = useService(GQLTabConnectionService)
const inspectionService = useService(InspectionService)
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")

const props = defineProps<{
  modelValue: HoppTab<HoppGQLRequestDocument>
}>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppGQLRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const showSaveRequestModal = ref(false)
const saveTippyActions = ref<HTMLDivElement | null>(null)

const tabCtx = computed(() => gqlTabConn.getTabConnectionState(tab.value.id))
const connected = computed(() => tabCtx.value.state === "CONNECTED")

const url = computed({
  get: () => tab.value.document.request.url,
  set: (value) => {
    tab.value.document.request.url = value
  },
})

const urlResults = inspectionService.getResultViewFor(
  tab.value.id,
  (result) => result.locations.type === "url"
)

const onConnectClick = () => {
  if (!connected.value) {
    gqlConnect()
  } else {
    gqlTabConn.disconnectTab(tab.value.id)
  }
}

const runQuery = () => {
  invokeAction("request.send-cancel")
}

const saveRequest = () => {
  const saveCtx = tab.value.document.saveContext

  if (!saveCtx) {
    showSaveRequestModal.value = true
    return
  }

  if (saveCtx.originLocation === "user-collection") {
    const req = tab.value.document.request

    if (saveCtx.requestIndex === undefined) {
      showSaveRequestModal.value = true
      return
    }

    editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex, req)

    // Ensure requestRefID is set in save context for active indicator
    if (!saveCtx.requestRefID && req._ref_id) {
      saveCtx.requestRefID = req._ref_id
    }

    tab.value.document.isDirty = false

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "graphql",
      createdNow: false,
      workspaceType: "personal",
    })
  } else if (saveCtx.originLocation === "team-collection") {
    const req = tab.value.document.request

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      platform: "graphql",
      createdNow: false,
      workspaceType: "team",
    })

    updateTeamRequest(saveCtx.requestID, {
      request: JSON.stringify(req),
      title: req.name,
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(`${t("profile.no_permission")}`)
      } else {
        tab.value.document.isDirty = false
        toast.success(`${t("request.saved")}`)
      }
    })
  } else {
    showSaveRequestModal.value = true
  }
}

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const shareRequest = () => {
  if (currentUser.value) {
    invokeAction("share.request", {
      request: tab.value.document.request,
    })
  } else {
    invokeAction("modals.login.toggle")
  }
}

const gqlConnect = () => {
  const inheritedHeaders = tab.value.document.inheritedProperties?.headers.map(
    (header) => {
      if (header.inheritedHeader) {
        return header.inheritedHeader
      }
      return []
    }
  ) as HoppGQLRequest["headers"]

  gqlTabConn.connectTab(tab.value.id, {
    url: url.value,
    request: tab.value.document.request,
    inheritedHeaders,
    inheritedAuth: tab.value.document.inheritedProperties?.auth
      .inheritedAuth as HoppGQLAuth,
  })

  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-schema",
    strategy: interceptorService.current.value!.id,
  })
}

// When URL changes while connected, auto-reconnect with the new URL
watch(
  () => tab.value.document.request.url,
  (_newUrl, oldUrl) => {
    if (connected.value && oldUrl !== undefined) {
      gqlTabConn.disconnectTab(tab.value.id)
      gqlConnect()
    }
  }
)

defineActionHandler(
  "gql.connect",
  gqlConnect,
  computed(() => !connected.value)
)

defineActionHandler(
  "gql.disconnect",
  () => gqlTabConn.disconnectTab(tab.value.id),
  connected
)
defineActionHandler("request-response.save", saveRequest)
defineActionHandler("request.save-as", () => {
  showSaveRequestModal.value = true
})
</script>
