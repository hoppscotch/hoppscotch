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
                      :disabled="connectionState"
                    />
                  </span>
                </template>
                <div class="flex flex-col" role="menu">
                  <SmartItem
                    v-for="(_, version) in socketIoClients"
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
              :class="{ error: !urlValid }"
              class="flex flex-1 w-full px-4 py-2 border bg-primaryLight border-divider text-secondaryDark"
              :placeholder="`${t('socketio.url')}`"
              :disabled="connectionState"
              @keyup.enter="urlValid ? toggleConnection() : null"
            />
            <input
              id="socketio-path"
              v-model="path"
              class="flex flex-1 w-full px-4 py-2 border rounded-r bg-primaryLight border-divider text-secondaryDark"
              spellcheck="false"
              :disabled="connectionState"
              @keyup.enter="urlValid ? toggleConnection() : null"
            />
          </div>
          <ButtonPrimary
            id="connect"
            :disabled="!urlValid"
            name="connect"
            class="w-32"
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
          This SocketIO connection does not use any authentication.
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
    </template>
    <template #secondary>
      <RealtimeLog :title="t('socketio.log')" :log="log" />
    </template>
    <template #sidebar>
      <div class="flex items-center justify-between p-4">
        <label for="events" class="font-semibold text-secondaryLight">
          {{ t("socketio.events") }}
        </label>
      </div>
      <div class="flex px-4">
        <input
          id="event_name"
          v-model="communication.eventName"
          class="input"
          name="event_name"
          :placeholder="`${t('socketio.event_name')}`"
          type="text"
          autocomplete="off"
          :disabled="!connectionState"
        />
      </div>
      <div class="flex items-center justify-between p-4">
        <label class="font-semibold text-secondaryLight">
          {{ t("socketio.communication") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('add.new')"
            svg="plus"
            @click.native="addCommunicationInput"
          />
        </div>
      </div>
      <div class="flex flex-col px-4 pb-4 space-y-2">
        <div
          v-for="(input, index) of communication.inputs"
          :key="`input-${index}`"
        >
          <div class="flex space-x-2">
            <input
              v-model="communication.inputs[index]"
              class="input"
              name="message"
              :placeholder="`${t('count.message', { count: index + 1 })}`"
              type="text"
              autocomplete="off"
              :disabled="!connectionState"
              @keyup.enter="connectionState ? sendMessage() : null"
            />
            <ButtonSecondary
              v-if="index + 1 !== communication.inputs.length"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.remove')"
              svg="trash"
              color="red"
              outline
              @click.native="removeCommunicationInput(index)"
            />
            <ButtonPrimary
              v-if="index + 1 === communication.inputs.length"
              id="send"
              name="send"
              :disabled="!connectionState"
              :label="t('action.send')"
              @click.native="sendMessage"
            />
          </div>
        </div>
      </div>
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import {
  ref,
  onUnmounted,
  computed,
  reactive,
  watch,
} from "@nuxtjs/composition-api"
// All Socket.IO client version imports
import ClientV2 from "socket.io-client-v2"
import { io as ClientV3 } from "socket.io-client-v3"
import { io as ClientV4 } from "socket.io-client-v4"
import wildcard from "socketio-wildcard"
import debounce from "lodash/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import {
  SIOEndpoint$,
  setSIOEndpoint,
  SIOVersion$,
  setSIOVersion,
  SIOPath$,
  setSIOPath,
  SIOConnectionState$,
  SIOConnectingState$,
  setSIOConnectionState,
  setSIOConnectingState,
  SIOSocket$,
  setSIOSocket,
  SIOLog$,
  setSIOLog,
  addSIOLogLine,
} from "~/newstore/SocketIOSession"
import {
  useStream,
  useI18n,
  useToast,
  useNuxt,
} from "~/helpers/utils/composables"

const t = useI18n()
const toast = useToast()
const nuxt = useNuxt()

const socketIoClients = {
  v4: ClientV4,
  v3: ClientV3,
  v2: ClientV2,
}

const url = useStream(SIOEndpoint$, "", setSIOEndpoint)
const clientVersion = useStream(SIOVersion$, "", setSIOVersion)
const path = useStream(SIOPath$, "", setSIOPath)
const connectingState = useStream(
  SIOConnectingState$,
  false,
  setSIOConnectingState
)
const connectionState = useStream(
  SIOConnectionState$,
  false,
  setSIOConnectionState
)
const io = useStream(SIOSocket$, null, setSIOSocket)
const log = useStream(SIOLog$, [], setSIOLog)
const authTypeOptions = ref<any>(null)
const versionOptions = ref<any>(null)

const isUrlValid = ref(true)
const communication = reactive({
  eventName: "",
  inputs: [""],
})
const authType = ref("None")
const bearerToken = ref("")
const authActive = ref(true)

const urlValid = computed(() => isUrlValid.value)

let worker: Worker

const workerResponseHandler = ({ data }) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

if (process.browser) {
  worker = nuxt.value.$worker.createRejexWorker()
  worker.addEventListener("message", workerResponseHandler)
}

watch(url, (newUrl) => {
  if (newUrl) debouncer()
})

watch(connectionState, (connected) => {
  if (connected) versionOptions.tippy().disable()
  else versionOptions.tippy().enable()
})

onUnmounted(() => {
  worker.terminate()
})

const debouncer = debounce(function () {
  worker.postMessage({ type: "socketio", url: url.value })
}, 1000)

const removeCommunicationInput = (index: number) => {
  nuxt.value.$delete(communication.inputs, index)
}
const addCommunicationInput = () => {
  communication.inputs.push("")
}
const toggleConnection = () => {
  // If it is connecting:
  if (!connectionState.value) return connect()
  // Otherwise, it's disconnecting.
  else return disconnect()
}
const connect = () => {
  connectingState.value = true
  log.value = [
    {
      payload: `${t("state.connecting_to", { name: url.value })}`,
      source: "info",
      color: "var(--accent-color)",
      ts: "",
    },
  ]

  try {
    if (!path.value) {
      path.value = "/socket.io"
    }
    const Client = socketIoClients[clientVersion.value]
    if (authActive.value && authType.value === "Bearer") {
      io.value = new Client(url.value, {
        path: path.value,
        auth: {
          token: bearerToken.value,
        },
      })
    } else {
      io.value = new Client(url.value, { path: path.value })
    }

    // Add ability to listen to all events
    wildcard(Client.Manager)(io.value)
    io.value.on("connect", () => {
      connectingState.value = false
      connectionState.value = true
      log.value = [
        {
          payload: `${t("state.connected_to", { name: url.value })}`,
          source: "info",
          color: "var(--accent-color)",
          ts: new Date().toLocaleTimeString(),
        },
      ]
      toast.success(`${t("state.connected")}`)
    })
    io.value.on("*", ({ data }) => {
      const [eventName, message] = data
      addSIOLogLine({
        payload: `[${eventName}] ${message ? JSON.stringify(message) : ""}`,
        source: "server",
        ts: new Date().toLocaleTimeString(),
      })
    })
    io.value.on("connect_error", (error: any) => {
      handleError(error)
    })
    io.value.on("reconnect_error", (error: any) => {
      handleError(error)
    })
    io.value.on("error", (error: any) => {
      handleError(error)
    })
    io.value.on("disconnect", () => {
      connectingState.value = false
      connectionState.value = false
      addSIOLogLine({
        payload: `${t("state.disconnected_from", { name: url.value })}`,
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      toast.error(`${t("state.disconnected")}`)
    })
  } catch (e) {
    handleError(e)
    toast.error(`${t("error.something_went_wrong")}`)
  }

  logHoppRequestRunToAnalytics({
    platform: "socketio",
  })
}
const disconnect = () => {
  io.value.close()
}
const handleError = (error: any) => {
  disconnect()
  connectingState.value = false
  connectionState.value = false
  addSIOLogLine({
    payload: `${t("error.something_went_wrong")}`,
    source: "info",
    color: "#ff5555",
    ts: new Date().toLocaleTimeString(),
  })
  if (error !== null)
    addSIOLogLine({
      payload: error,
      source: "info",
      color: "#ff5555",
      ts: new Date().toLocaleTimeString(),
    })
}
const sendMessage = () => {
  const eventName = communication.eventName
  const messages = (communication.inputs || [])
    .map((input) => {
      try {
        return JSON.parse(input)
      } catch (e) {
        return input
      }
    })
    .filter((message) => !!message)

  if (io.value) {
    io.value.emit(eventName, ...messages, (data: object) => {
      // receive response from server
      addSIOLogLine({
        payload: `[${eventName}] ${JSON.stringify(data)}`,
        source: "server",
        ts: new Date().toLocaleTimeString(),
      })
    })

    addSIOLogLine({
      payload: `[${eventName}] ${JSON.stringify(messages)}`,
      source: "client",
      ts: new Date().toLocaleTimeString(),
    })
    communication.inputs = [""]
  }
}
const onSelectVersion = (version: string) => {
  clientVersion.value = version
  versionOptions.tippy().hide()
}
</script>
