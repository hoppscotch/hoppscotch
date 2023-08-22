<template>
  <AppPaneLayout layout-id="socketio">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 space-x-2 overflow-x-auto bg-primary"
      >
        <div class="inline-flex flex-1 space-x-2">
          <div class="flex flex-1">
            <label for="client-version">
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions.focus()"
              >
                <span class="select-wrapper">
                  <input
                    id="client-version"
                    v-tippy="{ theme: 'tooltip' }"
                    title="socket.io-client version"
                    class="flex px-4 py-2 font-semibold border rounded-l cursor-pointer bg-primaryLight border-divider text-secondaryDark w-26"
                    :value="`Client ${clientVersion}`"
                    readonly
                    :disabled="
                      connectionState === 'CONNECTED' ||
                      connectionState === 'CONNECTING'
                    "
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      v-for="version in SIOVersions"
                      :key="`client-${version}`"
                      :label="`Client ${version}`"
                      @click="
                        () => {
                          onSelectVersion(version as SIOClientVersion)
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </label>
            <input
              id="socketio-url"
              v-model="url"
              type="url"
              autocomplete="off"
              spellcheck="false"
              :class="{ error: !isUrlValid }"
              class="flex flex-1 w-full px-4 py-2 border bg-primaryLight border-divider text-secondaryDark"
              :placeholder="`${t('socketio.url')}`"
              :disabled="
                connectionState === 'CONNECTED' ||
                connectionState === 'CONNECTING'
              "
              @keyup.enter="isUrlValid ? toggleConnection() : null"
            />
            <input
              id="socketio-path"
              v-model="path"
              class="flex flex-1 w-full px-4 py-2 border rounded-r bg-primaryLight border-divider text-secondaryDark"
              spellcheck="false"
              :disabled="
                connectionState === 'CONNECTED' ||
                connectionState === 'CONNECTING'
              "
              @keyup.enter="isUrlValid ? toggleConnection() : null"
            />
          </div>
          <HoppButtonPrimary
            id="connect"
            :disabled="!isUrlValid"
            name="connect"
            class="w-32"
            :label="
              connectionState === 'CONNECTING'
                ? t('action.connecting')
                : connectionState === 'DISCONNECTED'
                ? t('action.connect')
                : t('action.disconnect')
            "
            :loading="connectionState === 'CONNECTING'"
            @click="toggleConnection"
          />
        </div>
      </div>
      <HoppSmartTabs
        v-model="selectedTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
        render-inactive-tabs
      >
        <HoppSmartTab
          :id="'communication'"
          :label="`${t('websocket.communication')}`"
          render-inactive-tabs
        >
          <RealtimeCommunication
            :show-event-field="true"
            :is-connected="connectionState === 'CONNECTED'"
            event-field-styles="top-upperSecondaryStickyFold"
            sticky-header-styles="top-upperTertiaryStickyFold"
            @send-message="sendMessage($event)"
          />
        </HoppSmartTab>
        <HoppSmartTab
          :id="'protocols'"
          :label="`${t('request.authorization')}`"
        >
          <div
            class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
          >
            <span class="flex items-center">
              <label class="font-semibold truncate text-secondaryLight">
                {{ t("authorization.type") }}
              </label>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => authTippyActions.focus()"
              >
                <span class="select-wrapper">
                  <HoppButtonSecondary
                    class="pr-8 ml-2 rounded-none"
                    :label="authType"
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="authTippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      label="None"
                      :icon="authType === 'None' ? IconCircleDot : IconCircle"
                      :active="authType === 'None'"
                      @click="
                        () => {
                          authType = 'None'
                          hide()
                        }
                      "
                    />
                    <HoppSmartItem
                      label="Bearer Token"
                      :icon="authType === 'Bearer' ? IconCircleDot : IconCircle"
                      :active="authType === 'Bearer'"
                      @click="
                        () => {
                          authType = 'Bearer'
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
            <div class="flex">
              <HoppSmartCheckbox
                :on="authActive"
                class="px-2"
                @change="authActive = !authActive"
              >
                {{ t("state.enabled") }}
              </HoppSmartCheckbox>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/documentation/features/authorization"
                blank
                :title="t('app.wiki')"
                :icon="IconHelpCircle"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear')"
                :icon="IconTrash2"
                @click="clearContent"
              />
            </div>
          </div>
          <HoppSmartPlaceholder
            v-if="authType === 'None'"
            :src="`/images/states/${colorMode.value}/login.svg`"
            :alt="`${t('socketio.connection_not_authorized')}`"
            :text="`${t('socketio.connection_not_authorized')}`"
          >
            <HoppButtonSecondary
              outline
              :label="t('app.documentation')"
              to="https://docs.hoppscotch.io/documentation/features/authorization"
              blank
              :icon="IconExternalLink"
              reverse
            />
          </HoppSmartPlaceholder>
          <div
            v-if="authType === 'Bearer'"
            class="flex flex-1 border-b border-dividerLight"
          >
            <div class="w-2/3 border-r border-dividerLight">
              <div class="flex flex-1 border-b border-dividerLight">
                <SmartEnvInput v-model="bearerToken" placeholder="Token" />
              </div>
            </div>
            <div
              class="sticky flex-shrink-0 h-full p-4 overflow-auto overflow-x-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
            >
              <div class="p-2">
                <div class="pb-2 text-secondaryLight">
                  {{ t("helpers.authorization") }}
                </div>
                <HoppSmartAnchor
                  class="link"
                  :label="t('authorization.learn')"
                  :icon="IconExternalLink"
                  to="https://docs.hoppscotch.io/documentation/features/authorization"
                  blank
                  reverse
                />
              </div>
            </div>
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="t('socketio.log')"
        :log="log as LogEntryData[]"
        @delete="clearLogEntries()"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"

import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconExternalLink from "~icons/lucide/external-link"

import { debounce } from "lodash-es"
import {
  SIOConnection,
  SIOError,
  SIOMessage,
  SOCKET_CLIENTS,
} from "~/helpers/realtime/SIOConnection"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import {
  addSIOLogLine,
  setSIOEndpoint,
  setSIOLog,
  setSIOPath,
  setSIOVersion,
  SIOClientVersion,
  SIOEndpoint$,
  SIOLog$,
  SIOPath$,
  SIOVersion$,
} from "~/newstore/SocketIOSession"
import { useColorMode } from "@composables/theming"
import RegexWorker from "@workers/regex?worker"
import { LogEntryData } from "~/components/realtime/Log.vue"

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

type SIOTab = "communication" | "protocols"
const selectedTab = ref<SIOTab>("communication")

const SIOVersions = Object.keys(SOCKET_CLIENTS)
const url = useStream(SIOEndpoint$, "", setSIOEndpoint)
const clientVersion = useStream(SIOVersion$, "v4", setSIOVersion)
const path = useStream(SIOPath$, "", setSIOPath)
const socket = new SIOConnection()
const connectionState = useReadonlyStream(
  socket.connectionState$,
  "DISCONNECTED"
)
const log = useStream(SIOLog$, [], setSIOLog)

// Template refs
const tippyActions = ref<any | null>(null)
const authTippyActions = ref<any | null>(null)
const isUrlValid = ref(true)
const authType = ref<"None" | "Bearer">("None")
const bearerToken = ref("")
const authActive = ref(true)

let worker: Worker

const workerResponseHandler = ({
  data,
}: {
  data: { url: string; result: boolean }
}) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

const getMessagePayload = (data: SIOMessage): string =>
  typeof data.value === "object" ? JSON.stringify(data.value) : `${data.value}`

const getErrorPayload = (error: SIOError): string => {
  switch (error.type) {
    case "CONNECTION":
      return t("state.connection_error").toString()
    case "RECONNECT_ERROR":
      return t("state.reconnection_error").toString()
    default:
      return t("state.disconnected_from", { name: url.value }).toString()
  }
}

onMounted(() => {
  worker = new RegexWorker()
  worker.addEventListener("message", workerResponseHandler)

  subscribeToStream(socket.event$, (event) => {
    switch (event?.type) {
      case "CONNECTING":
        log.value = [
          {
            payload: `${t("state.connecting_to", { name: url.value })}`,
            source: "info",
            color: "var(--accent-color)",
            ts: undefined,
          },
        ]
        break

      case "CONNECTED":
        log.value = [
          {
            payload: `${t("state.connected_to", { name: url.value })}`,
            source: "info",
            color: "var(--accent-color)",
            ts: event.time,
          },
        ]
        toast.success(`${t("state.connected")}`)
        break

      case "MESSAGE_SENT":
        addSIOLogLine({
          prefix: `[${event.message.eventName}]`,
          payload: getMessagePayload(event.message),
          source: "client",
          ts: event.time,
        })
        break

      case "MESSAGE_RECEIVED":
        addSIOLogLine({
          prefix: `[${event.message.eventName}]`,
          payload: getMessagePayload(event.message),
          source: "server",
          ts: event.time,
        })
        break

      case "ERROR":
        addSIOLogLine({
          payload: getErrorPayload(event.error),
          source: "info",
          color: "#ff5555",
          ts: event.time,
        })
        break

      case "DISCONNECTED":
        addSIOLogLine({
          payload: t("state.disconnected_from", { name: url.value }).toString(),
          source: "disconnected",
          color: "#ff5555",
          ts: event.time,
        })
        toast.error(`${t("state.disconnected")}`)
        break
    }
  })
})

watch(url, (newUrl) => {
  if (newUrl) debouncer()
})

// TODO: How important is this ?
// watch(connectionState, (connected) => {
//   if (connected) versionOptions.value.tippy().disable()
//   else versionOptions.value.tippy().enable()
// })

onUnmounted(() => {
  worker.terminate()
})

const debouncer = debounce(function () {
  worker.postMessage({ type: "socketio", url: url.value })
}, 1000)

const toggleConnection = () => {
  // If it is connecting:
  if (connectionState.value === "DISCONNECTED") {
    return socket.connect({
      url: url.value,
      path: path.value || "/socket.io",
      clientVersion: clientVersion.value,
      auth: authActive.value
        ? {
            type: authType.value,
            token: bearerToken.value,
          }
        : undefined,
    })
  }
  // Otherwise, it's disconnecting.
  socket.disconnect()
}
const sendMessage = (event: { message: string; eventName: string }) => {
  socket.sendMessage(event)
}
const onSelectVersion = (version: SIOClientVersion) => {
  clientVersion.value = version
}
const clearLogEntries = () => {
  log.value = []
}
const clearContent = () => {
  // TODO: Implementation ?
}
</script>
