<template>
  <AppPaneLayout>
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary hide-scrollbar"
      >
        <div class="inline-flex flex-1 space-x-2">
          <div class="flex flex-1">
            <label for="client-version">
              <tippy
                ref="versionOptions"
                interactive
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
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
                </template>
                <div class="flex flex-col" role="menu">
                  <SmartItem
                    v-for="version in SIOVersions"
                    :key="`client-${version}`"
                    :label="`Client ${version}`"
                    @click.native="onSelectVersion(version)"
                  />
                </div>
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
          <ButtonPrimary
            id="connect"
            :disabled="!isUrlValid"
            name="connect"
            class="w-32"
            :label="
              connectionState === 'DISCONNECTED'
                ? t('action.connect')
                : t('action.disconnect')
            "
            :loading="connectionState === 'CONNECTING'"
            @click.native="toggleConnection"
          />
        </div>
      </div>

      <SmartTabs
        v-model="selectedTab"
        styles="sticky bg-primary top-upperPrimaryStickyFold z-10"
      >
        <SmartTab
          :id="'communication'"
          :label="`${t('websocket.communication')}`"
        >
          <RealtimeCommunication
            :show-event-field="true"
            :is-connected="connectionState === 'CONNECTED'"
            @send-message="sendMessage($event)"
          ></RealtimeCommunication>
        </SmartTab>
        <SmartTab :id="'protocols'" :label="`${t('request.authorization')}`">
          <div
            class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
          >
            <span class="flex items-center">
              <label class="font-semibold text-secondaryLight">
                {{ t("authorization.type") }}
              </label>
              <tippy
                ref="authTypeOptions"
                interactive
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
                  <span class="select-wrapper">
                    <ButtonSecondary
                      class="pr-8 ml-2 rounded-none"
                      :label="authType"
                    />
                  </span>
                </template>
                <div class="flex flex-col" role="menu">
                  <SmartItem
                    label="None"
                    :icon="
                      authType === 'None'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    "
                    :active="authType === 'None'"
                    @click.native="
                      () => {
                        authType = 'None'
                        authTypeOptions.tippy().hide()
                      }
                    "
                  />
                  <SmartItem
                    label="Bearer Token"
                    :icon="
                      authType === 'Bearer'
                        ? 'radio_button_checked'
                        : 'radio_button_unchecked'
                    "
                    :active="authType === 'Bearer'"
                    @click.native="
                      () => {
                        authType = 'Bearer'
                        authTypeOptions.tippy().hide()
                      }
                    "
                  />
                </div>
              </tippy>
            </span>
            <div class="flex">
              <SmartCheckbox
                :on="authActive"
                class="px-2"
                @change="authActive = !authActive"
              >
                {{ t("state.enabled") }}
              </SmartCheckbox>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/features/authorization"
                blank
                :title="t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear')"
                svg="trash-2"
                @click.native="clearContent"
              />
            </div>
          </div>
          <div
            v-if="authType === 'None'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/login.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.authorization')}`"
            />
            <span class="pb-4 text-center">
              {{ t("socketio.connection_not_authorized") }}
            </span>
            <ButtonSecondary
              outline
              :label="t('app.documentation')"
              to="https://docs.hoppscotch.io/features/authorization"
              blank
              svg="external-link"
              reverse
              class="mb-4"
            />
          </div>
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
              class="sticky h-full p-4 overflow-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
            >
              <div class="p-2">
                <div class="pb-2 text-secondaryLight">
                  {{ t("helpers.authorization") }}
                </div>
                <SmartAnchor
                  class="link"
                  :label="`${t('authorization.learn')} \xA0 →`"
                  to="https://docs.hoppscotch.io/features/authorization"
                  blank
                />
              </div>
            </div>
          </div>
        </SmartTab>
      </SmartTabs>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="t('socketio.log')"
        :log="log"
        @delete="clearLogEntries()"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "@nuxtjs/composition-api"
import debounce from "lodash/debounce"
import {
  SIOConnection,
  SIOError,
  SIOMessage,
  SOCKET_CLIENTS,
} from "~/helpers/realtime/SIOConnection"
import {
  useI18n,
  useNuxt,
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
  useToast,
} from "~/helpers/utils/composables"
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

const t = useI18n()
const toast = useToast()
const nuxt = useNuxt()
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
const authTypeOptions = ref<any>(null)
const versionOptions = ref<any | null>(null)

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
  worker = nuxt.value.$worker.createRejexWorker()
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
          source: "info",
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

watch(connectionState, (connected) => {
  if (connected) versionOptions.value.tippy().disable()
  else versionOptions.value.tippy().enable()
})

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
  versionOptions.value.tippy().hide()
}
const clearLogEntries = () => {
  log.value = []
}
</script>
