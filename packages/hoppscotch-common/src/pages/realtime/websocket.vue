<template>
  <AppPaneLayout layout-id="websocket">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 space-x-2 overflow-x-auto bg-primary"
      >
        <HoppSmartInput
          v-model="url"
          type="url"
          :autofocus="false"
          styles="!inline-flex flex-1 space-x-2"
          input-styles="w-full px-4 py-2 border rounded !bg-primaryLight border-divider text-secondaryDark"
          :placeholder="`${t('websocket.url')}`"
          :disabled="
            connectionState === 'CONNECTED' || connectionState === 'CONNECTING'
          "
          @submit="isUrlValid ? toggleConnection() : null"
        >
          <template #button>
            <HoppButtonPrimary
              id="connect"
              :disabled="!isUrlValid"
              class="w-32"
              name="connect"
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
          </template>
        </HoppSmartInput>
      </div>
      <HoppSmartTabs
        v-model="selectedTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
        render-inactive-tabs
      >
        <HoppSmartTab
          :id="'communication'"
          :label="`${t('websocket.communication')}`"
        >
          <RealtimeCommunication
            :is-connected="connectionState === 'CONNECTED'"
            class="cmResponsePrimaryStickyFold"
            sticky-header-styles="top-upperSecondaryStickyFold"
            @send-message="sendMessage($event)"
          />
        </HoppSmartTab>
        <HoppSmartTab :id="'protocols'" :label="`${t('websocket.protocols')}`">
          <div
            class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
          >
            <label class="font-semibold truncate text-secondaryLight">
              {{ t("websocket.protocols") }}
            </label>
            <div class="flex">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear_all')"
                :icon="IconTrash2"
                @click="clearContent"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('add.new')"
                :icon="IconPlus"
                @click="addProtocol"
              />
            </div>
          </div>
          <draggable
            v-model="protocolsWithID"
            item-key="id"
            animation="250"
            handle=".draggable-handle"
            draggable=".draggable-content"
            ghost-class="cursor-move"
            chosen-class="bg-primaryLight"
            drag-class="cursor-grabbing"
          >
            <template #item="{ element: { protocol }, index }">
              <div
                class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
              >
                <span>
                  <HoppButtonSecondary
                    v-tippy="{
                      theme: 'tooltip',
                      delay: [500, 20],
                      content:
                        index !== protocols?.length - 1
                          ? t('action.drag_to_reorder')
                          : null,
                    }"
                    :icon="IconGripVertical"
                    class="cursor-auto text-primary hover:text-primary"
                    :class="{
                      'draggable-handle group-hover:text-secondaryLight !cursor-grab':
                        index !== protocols?.length - 1,
                    }"
                    tabindex="-1"
                  />
                </span>
                <input
                  v-model="protocol.value"
                  class="flex flex-1 px-4 py-2 bg-transparent"
                  :placeholder="`${t('count.protocol', { count: index + 1 })}`"
                  name="message"
                  type="text"
                  autocomplete="off"
                  @change="
                    updateProtocol(index, {
                      value: ($event.target as HTMLInputElement).value,
                      active: protocol.active,
                    })
                  "
                />
                <span>
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="
                      protocol.hasOwnProperty('active')
                        ? protocol.active
                          ? t('action.turn_off')
                          : t('action.turn_on')
                        : t('action.turn_off')
                    "
                    :icon="
                      protocol.hasOwnProperty('active')
                        ? protocol.active
                          ? IconCheckCircle
                          : IconCircle
                        : IconCheckCircle
                    "
                    color="green"
                    @click="
                      updateProtocol(index, {
                        value: protocol.value,
                        active: !protocol.active,
                      })
                    "
                  />
                </span>
                <span>
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.remove')"
                    :icon="IconTrash"
                    color="red"
                    @click="deleteProtocol(index)"
                  />
                </span>
              </div>
            </template>
          </draggable>
          <HoppSmartPlaceholder
            v-if="protocols.length === 0"
            :src="`/images/states/${colorMode.value}/add_category.svg`"
            :alt="`${t('empty.protocols')}`"
            :text="`${t('empty.protocols')}`"
          >
          </HoppSmartPlaceholder>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="t('websocket.log')"
        :log="log as LogEntryData[]"
        @delete="clearLogEntries()"
      />
    </template>
  </AppPaneLayout>
</template>
<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from "vue"
import { debounce } from "lodash-es"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlus from "~icons/lucide/plus"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconTrash from "~icons/lucide/trash"
import draggable from "vuedraggable-es"
import {
  setWSEndpoint,
  WSEndpoint$,
  WSProtocols$,
  setWSProtocols,
  addWSProtocol,
  deleteWSProtocol,
  updateWSProtocol,
  deleteAllWSProtocols,
  addWSLogLine,
  WSLog$,
  setWSLog,
  HoppWSProtocol,
  setWSSocket,
  WSSocket$,
} from "~/newstore/WebSocketSession"
import { useI18n } from "@composables/i18n"
import {
  useStream,
  useStreamSubscriber,
  useReadonlyStream,
} from "@composables/stream"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { WSConnection, WSErrorMessage } from "@helpers/realtime/WSConnection"
import RegexWorker from "@workers/regex?worker"
import { LogEntryData } from "~/components/realtime/Log.vue"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const { subscribeToStream } = useStreamSubscriber()

const selectedTab = ref<"communication" | "protocols">("communication")
const url = useStream(WSEndpoint$, "", setWSEndpoint)
const protocols = useStream(WSProtocols$, [], setWSProtocols)

/**
 * Protocols but with ID inbuilt
 */
const protocolsWithID = computed({
  get() {
    return protocols.value.map((protocol, index) => ({
      id: `protocol-${index}-${protocol.value}`,
      protocol,
    }))
  },
  set(newData) {
    protocols.value = newData.map(({ protocol }) => protocol)
  },
})

const socket = useStream(WSSocket$, new WSConnection(), setWSSocket)

const connectionState = useReadonlyStream(
  socket.value.connectionState$,
  "DISCONNECTED"
)

const log = useStream(WSLog$, [], setWSLog)
// DATA
const isUrlValid = ref(true)

const activeProtocols = ref<string[]>([])

let worker: Worker

watch(url, (newUrl) => {
  if (newUrl) debouncer()
})

watch(
  protocols,
  (newProtocols) => {
    activeProtocols.value = newProtocols
      .filter((item) =>
        Object.prototype.hasOwnProperty.call(item, "active")
          ? item.active === true
          : true
      )
      .map(({ value }) => value)
  },
  { deep: true }
)
const workerResponseHandler = ({
  data,
}: {
  data: { url: string; result: boolean }
}) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

const getErrorPayload = (error: WSErrorMessage): string => {
  if (error instanceof SyntaxError) {
    return error.message
  }
  return t("error.something_went_wrong").toString()
}

onMounted(() => {
  worker = new RegexWorker()
  worker.addEventListener("message", workerResponseHandler)

  subscribeToStream(socket.value.event$, (event) => {
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
            ts: Date.now(),
          },
        ]
        toast.success(`${t("state.connected")}`)
        break

      case "MESSAGE_SENT":
        addWSLogLine({
          payload: event.message,
          source: "client",
          ts: Date.now(),
        })
        break

      case "MESSAGE_RECEIVED":
        addWSLogLine({
          payload: event.message,
          source: "server",
          ts: event.time,
        })
        break

      case "ERROR":
        addWSLogLine({
          payload: getErrorPayload(event.error),
          source: "info",
          color: "#ff5555",
          ts: event.time,
        })
        break

      case "DISCONNECTED":
        addWSLogLine({
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

onUnmounted(() => {
  if (worker) worker.terminate()
})
const clearContent = () => {
  deleteAllWSProtocols()
}
const debouncer = debounce(function () {
  worker.postMessage({ type: "ws", url: url.value })
}, 1000)

const toggleConnection = () => {
  // If it is connecting:
  if (connectionState.value === "DISCONNECTED") {
    return socket.value.connect(url.value, activeProtocols.value)
  }
  // Otherwise, it's disconnecting.
  socket.value.disconnect()
}

const sendMessage = (event: { message: string; eventName: string }) => {
  socket.value.sendMessage(event)
}
const addProtocol = () => {
  addWSProtocol({ value: "", active: true })
}
const deleteProtocol = (index: number) => {
  const oldProtocols = protocols.value.slice()
  deleteWSProtocol(index)
  toast.success(`${t("state.deleted")}`, {
    duration: 4000,
    action: {
      text: `${t("action.undo")}`,
      onClick: (_, toastObject) => {
        protocols.value = oldProtocols
        toastObject.goAway()
      },
    },
  })
}
const updateProtocol = (index: number, updated: HoppWSProtocol) => {
  updateWSProtocol(index, updated)
}
const clearLogEntries = () => {
  log.value = []
}
</script>
