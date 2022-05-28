<template>
  <AppPaneLayout>
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary hide-scrollbar"
      >
        <div class="inline-flex flex-1 space-x-2">
          <input
            id="websocket-url"
            v-model="url"
            class="w-full px-4 py-2 border rounded bg-primaryLight border-divider text-secondaryDark"
            type="url"
            autocomplete="off"
            spellcheck="false"
            :class="{ error: !isUrlValid }"
            :placeholder="`${t('websocket.url')}`"
            :disabled="
              connectionState === 'CONNECTED' ||
              connectionState === 'CONNECTING'
            "
            @keyup.enter="isUrlValid ? toggleConnection() : null"
          />
          <ButtonPrimary
            id="connect"
            :disabled="!isUrlValid"
            class="w-32"
            name="connect"
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
        styles="sticky bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
      >
        <SmartTab
          :id="'communication'"
          :label="`${$t('websocket.communication')}`"
        >
          <RealtimeCommunication
            :is-connected="connectionState === 'CONNECTED'"
            @send-message="sendMessage($event)"
          ></RealtimeCommunication>
        </SmartTab>
        <SmartTab :id="'protocols'" :label="`${$t('websocket.protocols')}`">
          <div
            class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperPrimaryStickyFold"
          >
            <label class="font-semibold text-secondaryLight">
              {{ t("websocket.protocols") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear_all')"
                svg="trash-2"
                @click.native="clearContent"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('add.new')"
                svg="plus"
                @click.native="addProtocol"
              />
            </div>
          </div>
          <draggable
            v-model="protocols"
            animation="250"
            handle=".draggable-handle"
            draggable=".draggable-content"
            ghost-class="cursor-move"
            chosen-class="bg-primaryLight"
            drag-class="cursor-grabbing"
          >
            <div
              v-for="(protocol, index) of protocols"
              :key="`protocol-${index}`"
              class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
            >
              <span>
                <ButtonSecondary
                  svg="grip-vertical"
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
                    value: $event.target.value,
                    active: protocol.active,
                  })
                "
              />
              <span>
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="
                    protocol.hasOwnProperty('active')
                      ? protocol.active
                        ? t('action.turn_off')
                        : t('action.turn_on')
                      : t('action.turn_off')
                  "
                  :svg="
                    protocol.hasOwnProperty('active')
                      ? protocol.active
                        ? 'check-circle'
                        : 'circle'
                      : 'check-circle'
                  "
                  color="green"
                  @click.native="
                    updateProtocol(index, {
                      value: protocol.value,
                      active: !protocol.active,
                    })
                  "
                />
              </span>
              <span>
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.remove')"
                  svg="trash"
                  color="red"
                  @click.native="deleteProtocol(index)"
                />
              </span>
            </div>
          </draggable>
          <div
            v-if="protocols.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/add_category.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.protocols')}`"
            />
            <span class="mb-4 text-center">
              {{ t("empty.protocols") }}
            </span>
          </div>
        </SmartTab>
      </SmartTabs>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="$t('websocket.log')"
        :log="log"
        @delete="clearLogEntries()"
      />
    </template>
  </AppPaneLayout>
</template>
<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from "@nuxtjs/composition-api"
import debounce from "lodash/debounce"
import draggable from "vuedraggable"
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
import {
  useI18n,
  useStream,
  useToast,
  useNuxt,
  useStreamSubscriber,
  useReadonlyStream,
} from "~/helpers/utils/composables"
import { WSConnection, WSErrorMessage } from "~/helpers/realtime/WSConnection"

const nuxt = useNuxt()
const t = useI18n()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

const selectedTab = ref<"communication" | "protocols">("communication")
const url = useStream(WSEndpoint$, "", setWSEndpoint)
const protocols = useStream(WSProtocols$, [], setWSProtocols)

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
  worker = nuxt.value.$worker.createRejexWorker()
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
          source: "info",
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
