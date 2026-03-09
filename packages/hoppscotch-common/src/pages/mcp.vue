<template>
  <AppPaneLayout layout-id="mcp">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 flex-col space-y-2 overflow-x-auto bg-primary p-4"
      >
        <!-- Transport Type Selector -->
        <div class="flex items-center space-x-2">
          <label class="text-secondaryLight font-semibold">
            {{ t("mcp.transport_type") }}
          </label>
          <div class="flex space-x-2">
            <HoppButtonSecondary
              :label="t('mcp.http')"
              :filled="transportType === 'http'"
              @click="switchTransport('http')"
            />
            <HoppButtonSecondary
              :label="t('mcp.stdio')"
              :filled="transportType === 'stdio'"
              @click="switchTransport('stdio')"
            />
          </div>
        </div>

        <!-- HTTP Configuration -->
        <div v-if="transportType === 'http'" class="flex space-x-2">
          <HoppSmartInput
            v-model="httpUrl"
            type="url"
            :autofocus="false"
            styles="!inline-flex flex-1 space-x-2"
            input-styles="w-full px-4 py-2 border rounded !bg-primaryLight border-divider text-secondaryDark"
            :placeholder="`${t('mcp.url')}`"
            :disabled="
              connectionState === 'CONNECTED' ||
              connectionState === 'CONNECTING'
            "
            @submit="isConfigValid ? toggleConnection() : null"
          >
            <template #button>
              <HoppButtonPrimary
                id="connect"
                :disabled="!isConfigValid"
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

        <!-- STDIO Configuration -->
        <div v-if="transportType === 'stdio'" class="flex flex-col space-y-2">
          <div class="flex space-x-2">
            <input
              v-model="stdioCommand"
              class="flex flex-1 bg-primaryLight px-4 py-2 border rounded border-divider"
              :placeholder="t('mcp.server_command_placeholder')"
              type="text"
              :disabled="
                connectionState === 'CONNECTED' ||
                connectionState === 'CONNECTING'
              "
            />
            <HoppButtonPrimary
              id="connect"
              :disabled="!isConfigValid"
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
          </div>
          <div
            v-if="connectionState === 'DISCONNECTED'"
            class="flex items-center space-x-2 text-amber-500 text-sm px-2"
          >
            <icon-lucide-alert-circle class="svg-icons" />
            <span>{{ t("mcp.stdio_requires_agent") }}</span>
          </div>
        </div>
      </div>

      <HoppSmartTabs
        v-model="selectedTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
        render-inactive-tabs
      >
        <!-- Configuration Tab -->
        <HoppSmartTab
          :id="'configuration'"
          :label="`${t('mcp.server_config')}`"
        >
          <MCPConfiguration />
        </HoppSmartTab>

        <!-- Tools Tab -->
        <HoppSmartTab
          :id="'tools'"
          :label="`${t('mcp.tools')} (${tools.length})`"
          :disabled="!capabilities"
        >
          <MCPToolsList :tools="tools" @invoke="invokeTool" />
        </HoppSmartTab>

        <!-- Prompts Tab -->
        <HoppSmartTab
          :id="'prompts'"
          :label="`${t('mcp.prompts')} (${prompts.length})`"
          :disabled="!capabilities"
        >
          <MCPPromptsList :prompts="prompts" @invoke="invokePrompt" />
        </HoppSmartTab>

        <!-- Resources Tab -->
        <HoppSmartTab
          :id="'resources'"
          :label="`${t('mcp.resources')} (${resources.length})`"
          :disabled="!capabilities"
        >
          <MCPResourcesList :resources="resources" @read="readResource" />
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="t('mcp.log')"
        :log="log as LogEntryData[]"
        @delete="clearLogEntries()"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from "vue"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import {
  MCPTransportType$,
  MCPHTTPConfig$,
  MCPSTDIOConfig$,
  MCPConnection$,
  MCPLog$,
  MCPCapabilities$,
  MCPAuth$,
  setMCPTransportType,
  setMCPHTTPConfig,
  setMCPSTDIOConfig,
  setMCPConnection,
  setMCPLog,
  addMCPLogLine,
  setMCPCapabilities,
  MCPTransportType,
} from "~/newstore/MCPSession"
import { useI18n } from "@composables/i18n"
import { useStream, useStreamSubscriber } from "@composables/stream"
import { useToast } from "@composables/toast"
import { MCPHTTPConnection } from "@helpers/realtime/MCPHTTPConnection"
import { MCPSTDIOConnection } from "@helpers/realtime/MCPSTDIOConnection"
import { LogEntryData } from "~/components/realtime/Log.vue"
import MCPConfiguration from "~/components/mcp/Configuration.vue"
import MCPToolsList from "~/components/mcp/ToolsList.vue"
import MCPPromptsList from "~/components/mcp/PromptsList.vue"
import MCPResourcesList from "~/components/mcp/ResourcesList.vue"
import { usePageHead } from "~/composables/head"

const t = useI18n()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

usePageHead({
  title: computed(() => t("navigation.mcp")),
})

const selectedTab = ref<"configuration" | "tools" | "prompts" | "resources">(
  "configuration"
)

const transportType = useStream(
  MCPTransportType$,
  "http" as MCPTransportType,
  setMCPTransportType
)
const httpConfig = useStream(MCPHTTPConfig$, null, setMCPHTTPConfig)
const stdioConfig = useStream(MCPSTDIOConfig$, null, setMCPSTDIOConfig)
const connection = useStream(MCPConnection$, null as any, setMCPConnection)
const log = useStream(MCPLog$, [], setMCPLog)
const capabilities = useStream(MCPCapabilities$, null, setMCPCapabilities)
const auth = useStream(
  MCPAuth$,
  { authType: "none", authActive: false },
  () => {}
)

// Simplified state for inputs
const httpUrl = ref("")
const stdioCommand = ref("")

// Fix: React to connection changes
const connectionState = ref<"DISCONNECTED" | "CONNECTING" | "CONNECTED">(
  "DISCONNECTED"
)
watch(
  connection,
  (newConnection) => {
    if (newConnection?.connectionState$) {
      subscribeToStream(newConnection.connectionState$, (state) => {
        connectionState.value = state
      })
    } else {
      connectionState.value = "DISCONNECTED"
    }
  },
  { immediate: true }
)

const tools = computed(() => capabilities.value?.tools || [])
const prompts = computed(() => capabilities.value?.prompts || [])
const resources = computed(() => capabilities.value?.resources || [])

const isConfigValid = computed(() => {
  if (transportType.value === "http") {
    return httpUrl.value.trim().length > 0
  }
  return stdioCommand.value.trim().length > 0
})

watch(httpConfig, (config) => {
  if (config) {
    httpUrl.value = config.url
  }
})

watch(stdioConfig, (config) => {
  if (config) {
    stdioCommand.value = config.command
  }
})

watch(httpUrl, (newUrl) => {
  if (transportType.value === "http") {
    setMCPHTTPConfig({ url: newUrl })
  }
})

watch(stdioCommand, (newCommand) => {
  if (transportType.value === "stdio") {
    setMCPSTDIOConfig({
      command: newCommand,
      args: [],
      env: [],
    })
  }
})

const switchTransport = (type: MCPTransportType) => {
  if (connectionState.value !== "DISCONNECTED") {
    toast.error("Please disconnect before switching transport")
    return
  }
  setMCPTransportType(type)
}

const toggleConnection = async () => {
  if (connectionState.value === "DISCONNECTED") {
    await connectToServer()
  } else {
    connection.value?.disconnect()
  }
}

const connectToServer = async () => {
  try {
    let newConnection

    if (transportType.value === "http") {
      // Fix: Use stored auth instead of hardcoded "none"
      newConnection = new MCPHTTPConnection(httpUrl.value, auth.value)
    } else {
      // Fix: Use stored config and parse command properly
      const config = stdioConfig.value || {
        command: stdioCommand.value,
        args: [],
        env: [],
      }
      // Simple command parsing - split on spaces but respect quotes
      const parts = config.command.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || []
      const command = parts[0]?.replace(/["']/g, "") || ""
      const args =
        config.args.length > 0
          ? config.args
          : parts.slice(1).map((arg) => arg.replace(/["']/g, ""))

      newConnection = new MCPSTDIOConnection({
        command,
        args,
        env: config.env.reduce(
          (acc, { key, value }) => ({ ...acc, [key]: value }),
          {}
        ),
      })
    }

    setMCPConnection(newConnection)

    subscribeToStream(newConnection.event$, (event) => {
      handleMCPEvent(event)
    })

    await newConnection.connect()
  } catch (error: any) {
    toast.error(error.message || "Failed to connect")
  }
}

const handleMCPEvent = (event: any) => {
  switch (event?.type) {
    case "CONNECTING":
      log.value = [
        {
          payload: `${t("state.connecting_to", { name: transportType.value === "http" ? httpUrl.value : "STDIO server" })}`,
          source: "info",
          color: "var(--accent-color)",
          ts: undefined,
        },
      ]
      break

    case "CONNECTED":
      addMCPLogLine({
        payload: `${t("state.connected")}`,
        source: "info",
        color: "var(--accent-color)",
        ts: Date.now(),
      })
      toast.success(`${t("state.connected")}`)
      break

    case "CAPABILITIES_LOADED":
      setMCPCapabilities(event.capabilities)
      addMCPLogLine({
        payload: `${t("mcp.capabilities_loaded")}: ${event.capabilities.tools.length} tools, ${event.capabilities.prompts.length} prompts, ${event.capabilities.resources.length} resources`,
        source: "info",
        color: "var(--accent-color)",
        ts: Date.now(),
      })
      selectedTab.value = "tools"
      break

    case "METHOD_INVOKED":
      addMCPLogLine({
        payload: `Invoked: ${event.method}`,
        source: "client",
        ts: Date.now(),
      })
      break

    case "RESPONSE_RECEIVED":
      addMCPLogLine({
        payload: JSON.stringify(event.response, null, 2),
        source: "server",
        ts: Date.now(),
      })
      break

    case "ERROR":
      addMCPLogLine({
        payload:
          event.error?.message || event.error?.toString() || "Unknown error",
        source: "info",
        color: "#ff5555",
        ts: Date.now(),
      })
      toast.error(event.error?.message || "An error occurred")
      break

    case "DISCONNECTED":
      addMCPLogLine({
        payload: t("state.disconnected").toString(),
        source: "disconnected",
        color: "#ff5555",
        ts: Date.now(),
      })
      toast.error(`${t("state.disconnected")}`)
      setMCPCapabilities(null)
      break
  }
}

const invokeTool = async (tool: any, args: any) => {
  try {
    if (connection.value) {
      await connection.value.invokeTool(tool.name, args)
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to invoke tool")
  }
}

const invokePrompt = async (prompt: any, args: any) => {
  try {
    if (connection.value) {
      await connection.value.invokePrompt(prompt.name, args)
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to invoke prompt")
  }
}

const readResource = async (resource: any) => {
  try {
    if (connection.value) {
      await connection.value.readResource(resource.uri)
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to read resource")
  }
}

const clearLogEntries = () => {
  log.value = []
}

onMounted(() => {
  // Initialize with default config if needed
  if (!httpConfig.value) {
    setMCPHTTPConfig({ url: "" })
  }
  if (!stdioConfig.value) {
    setMCPSTDIOConfig({
      command: "",
      args: [],
      env: [],
    })
  }
})

onUnmounted(() => {
  if (connection.value && connectionState.value !== "DISCONNECTED") {
    connection.value.disconnect()
  }
})
</script>
