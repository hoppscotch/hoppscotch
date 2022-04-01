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
            :class="{ error: !urlValid }"
            :placeholder="`${t('websocket.url')}`"
            :disabled="connectionState"
            @keyup.enter="urlValid ? toggleConnection() : null"
          />
          <ButtonPrimary
            id="connect"
            :disabled="!urlValid"
            class="w-32"
            name="connect"
            :label="
              !connectionState ? t('action.connect') : t('action.disconnect')
            "
            :loading="connectingState"
            @click.native="toggleConnection"
          />
        </div>
      </div>
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
    </template>
    <template #secondary>
      <RealtimeLog :title="t('websocket.log')" :log="log" />
    </template>
    <template #sidebar>
      <div class="flex items-center justify-between p-4">
        <label
          for="websocket-message"
          class="font-semibold text-secondaryLight"
        >
          {{ t("websocket.communication") }}
        </label>
      </div>
      <div class="flex px-4 space-x-2">
        <input
          id="websocket-message"
          v-model="communication.input"
          name="message"
          type="text"
          autocomplete="off"
          :disabled="!connectionState"
          :placeholder="`${t('websocket.message')}`"
          class="input"
          @keyup.enter="connectionState ? sendMessage() : null"
          @keyup.up="connectionState ? walkHistory('up') : null"
          @keyup.down="connectionState ? walkHistory('down') : null"
        />
        <ButtonPrimary
          id="send"
          name="send"
          :disabled="!connectionState"
          :label="t('action.send')"
          @click.native="sendMessage"
        />
      </div>
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import {
  defineComponent,
  computed,
  ref,
  watch,
  onUnmounted,
  onMounted,
} from "@nuxtjs/composition-api"
import debounce from "lodash/debounce"
import draggable from "vuedraggable"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import {
  setWSEndpoint,
  WSEndpoint$,
  WSProtocols$,
  setWSProtocols,
  addWSProtocol,
  deleteWSProtocol,
  updateWSProtocol,
  deleteAllWSProtocols,
  WSSocket$,
  setWSSocket,
  setWSConnectionState,
  setWSConnectingState,
  WSConnectionState$,
  WSConnectingState$,
  addWSLogLine,
  WSLog$,
  setWSLog,
} from "~/newstore/WebSocketSession"
import {
  useI18n,
  useStream,
  useToast,
  useNuxt,
} from "~/helpers/utils/composables"

const nuxt = useNuxt()
const t = useI18n()
const $toast = useToast()

const url = useStream(WSEndpoint$, "", setWSEndpoint)
const protocols = useStream(WSProtocols$, [], setWSProtocols)
const connectionState = useStream(
  WSConnectionState$,
  false,
  setWSConnectionState
)
const connectingState = useStream(
  WSConnectingState$,
  false,
  setWSConnectingState
)
const socket = useStream(WSSocket$, null, setWSSocket)
const log = useStream(WSLog$, [], setWSLog)

// DATA
const isUrlValid = ref(true)
const communication = {
  input: "",
}

const currentIndex = ref(-1) // index of the message log array to put in input box
const activeProtocols = ref<string[]>([])

const urlValid = computed(() => isUrlValid)
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

defineComponent({
  components: {
    draggable,
  },
})

onMounted(() => {
  if (process.browser) {
    worker = nuxt.value.$worker.createRejexWorker()
    worker.addEventListener("message", workerResponseHandler)
  }
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

const workerResponseHandler = ({
  data,
}: {
  data: { url: string; result: boolean }
}) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

const toggleConnection = () => {
  // If it is connecting:
  if (!connectionState.value) return connect()
  // Otherwise, it's disconnecting.
  else return disconnect()
}

const connect = () => {
  console.log("Connecting...")
  log.value = [
    {
      payload: `${t("state.connecting_to", { name: url.value })}`,
      source: "info",
      color: "var(--accent-color)",
      ts: "",
    },
  ]
  try {
    connectingState.value = true
    socket.value = new WebSocket(url.value, activeProtocols.value)

    socket.value.onopen = () => {
      connectingState.value = false
      connectionState.value = true
      log.value = [
        {
          payload: t("state.connected_to", { name: url.value }) as string,
          source: "info",
          color: "var(--accent-color)",
          ts: new Date().toLocaleTimeString(),
        },
      ]
      $toast.success(t("state.connected") as string)
    }

    socket.value.onerror = (error) => {
      handleError(error)
    }

    socket.value.onclose = () => {
      connectionState.value = false
      addWSLogLine({
        payload: t("state.disconnected_from", { name: url.value }) as string,
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      $toast.error(t("state.disconnected") as string)
    }

    socket.value.onmessage = ({ data }) => {
      addWSLogLine({
        payload: data,
        source: "server",
        ts: new Date().toLocaleTimeString(),
      })
    }
  } catch (e) {
    handleError(e)
    $toast.error(t("error.something_went_wrong") as string)
  }

  logHoppRequestRunToAnalytics({
    platform: "wss",
  })
}

const disconnect = () => {
  if (socket.value) {
    socket.value.close()
    connectionState.value = false
    connectingState.value = false
  }
}

const handleError = (error: any) => {
  disconnect()
  connectionState.value = false

  addWSLogLine({
    payload: `${t("error.something_went_wrong")}`,
    source: "info",
    color: "#ff5555",
    ts: new Date().toLocaleTimeString(),
  })
  if (error !== null)
    addWSLogLine({
      payload: error,
      source: "info",
      color: "#ff5555",
      ts: new Date().toLocaleTimeString(),
    })
}

const sendMessage = () => {
  const message = communication.input
  socket.value.send(message)
  addWSLogLine({
    payload: message,
    source: "client",
    ts: new Date().toLocaleTimeString(),
  })
  communication.input = ""
}

const walkHistory = (direction: "up" | "down") => {
  const clientMessages = log.value.filter(({ source }) => source === "client")
  const length = clientMessages.length
  switch (direction) {
    case "up":
      if (length > 0 && currentIndex.value !== 0) {
        // does nothing if message log is empty or the currentIndex is 0 when up arrow is pressed
        if (currentIndex.value === -1) {
          currentIndex.value = length - 1
          communication.input = clientMessages[currentIndex.value].payload
        } else if (currentIndex.value === 0) {
          communication.input = clientMessages[0].payload
        } else if (currentIndex.value > 0) {
          currentIndex.value = currentIndex.value - 1
          communication.input = clientMessages[currentIndex.value].payload
        }
      }
      break
    case "down":
      if (length > 0 && currentIndex.value > -1) {
        if (currentIndex.value === length - 1) {
          currentIndex.value = -1
          communication.input = ""
        } else if (currentIndex.value < length - 1) {
          currentIndex.value = currentIndex.value + 1
          communication.input = clientMessages[currentIndex.value].payload
        }
      }
      break
  }
}

const addProtocol = () => {
  addWSProtocol({ value: "", active: true })
}

const deleteProtocol = (index: number) => {
  const oldProtocols = protocols.value.slice()
  deleteWSProtocol(index)
  $toast.success(`${t("state.deleted")}`, {
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

const updateProtocol = (index: number, updated: any) => {
  updateWSProtocol(index, updated)
}
</script>
