<template>
  <AppPaneLayout layout-id="mcp">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 flex-col gap-3 overflow-x-auto bg-primary p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <label class="font-semibold text-secondaryLight">
              {{ t("mcp.transport") }}
            </label>
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

          <div class="flex flex-wrap items-center gap-2">
            <HoppButtonSecondary
              :icon="IconBookOpen"
              :label="t('mcp.browse_servers')"
              @click="showServerCatalog = true"
            />
            <HoppButtonSecondary
              :icon="IconSave"
              :label="t('collection.save_to_collection')"
              @click="showCollectionsModal = true"
            />
            <HoppButtonSecondary
              :icon="IconHistory"
              :label="t('tab.history')"
              @click="showHistoryModal = true"
            />
            <HoppButtonPrimary
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
              :disabled="
                connectionState === 'DISCONNECTED' ? !isConfigValid : false
              "
              @click="toggleConnection"
            />
          </div>
        </div>

        <p class="truncate text-sm text-secondaryLight">
          {{ connectionTarget }}
        </p>
      </div>

      <HoppSmartTabs
        v-model="selectedTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
        render-inactive-tabs
      >
        <HoppSmartTab
          :id="'configuration'"
          :label="`${t('mcp.configuration')}`"
        >
          <McpConfiguration
            :connection-state="connectionState"
            :capabilities-loading="capabilitiesLoading"
            @load-capabilities="loadCapabilities"
          />
        </HoppSmartTab>
        <HoppSmartTab
          :id="'tools'"
          :label="`${t('mcp.tools')} (${tools.length})`"
          :disabled="connectionState !== 'CONNECTED'"
        >
          <McpToolsList :tools="tools" @invoke="invokeTool" />
        </HoppSmartTab>
        <HoppSmartTab
          :id="'prompts'"
          :label="`${t('mcp.prompts')} (${prompts.length})`"
          :disabled="connectionState !== 'CONNECTED'"
        >
          <McpPromptsList :prompts="prompts" @invoke="invokePrompt" />
        </HoppSmartTab>
        <HoppSmartTab
          :id="'resources'"
          :label="`${t('mcp.resources')} (${resources.length})`"
          :disabled="connectionState !== 'CONNECTED'"
        >
          <McpResourcesList :resources="resources" @read="readResource" />
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>

    <template #secondary>
      <HoppSmartTabs
        v-model="selectedOutputTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
        render-inactive-tabs
      >
        <HoppSmartTab :id="'logs'" :label="`${t('mcp.log')}`">
          <RealtimeLog
            :title="t('mcp.log')"
            :log="log as LogEntryData[]"
            @delete="clearLogEntries"
          />
        </HoppSmartTab>

        <HoppSmartTab :id="'response'" :label="`${t('mcp.response')}`">
          <div class="flex flex-1 flex-col overflow-auto">
            <div
              class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
            >
              <label class="truncate font-semibold text-secondaryLight">
                {{ t("mcp.response") }}
              </label>
              <div class="flex">
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.clear')"
                  :icon="IconTrash2"
                  @click="clearLatestResponse"
                />
              </div>
            </div>

            <pre
              v-if="latestResponse"
              class="flex-1 whitespace-pre-wrap break-words p-4 font-mono text-sm text-secondaryDark"
              >{{ latestResponse }}</pre
            >

            <HoppSmartPlaceholder
              v-else
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('mcp.no_response')}`"
              :text="`${t('mcp.no_response')}`"
            />
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
  </AppPaneLayout>

  <HoppSmartModal
    v-if="showServerCatalog"
    dialog
    :title="t('mcp.server_catalog')"
    @close="showServerCatalog = false"
  >
    <template #body>
      <McpServerCatalog @select="handleServerSelect" />
    </template>
  </HoppSmartModal>

  <HoppSmartModal
    v-if="showCollectionsModal"
    dialog
    :title="t('collection.save_to_collection')"
    @close="showCollectionsModal = false"
  >
    <template #body>
      <CollectionsMcp save-request @select-collection="saveToCollection" />
    </template>
  </HoppSmartModal>

  <HoppSmartModal
    v-if="showHistoryModal"
    dialog
    styles="sm:max-w-3xl"
    full-width
    :title="t('tab.history')"
    @close="showHistoryModal = false"
  >
    <template #body>
      <div class="flex max-h-[70vh] flex-col overflow-hidden">
        <div
          class="sticky top-0 z-10 flex items-center border-b border-dividerLight bg-primary"
        >
          <input
            v-model="historyFilter"
            type="search"
            autocomplete="off"
            class="flex h-8 w-full bg-transparent px-4 py-2"
            :placeholder="t('action.search')"
          />
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              :disabled="history.length === 0"
              @click="clearHistoryEntries"
            />
          </div>
        </div>

        <div
          v-if="filteredHistory.length > 0"
          class="flex flex-col overflow-auto"
        >
          <HistoryMcpCard
            v-for="entry in filteredHistory"
            :key="historyKey(entry)"
            :entry="entry"
            @use-entry="useHistoryEntry(entry)"
            @delete-entry="deleteHistoryEntry(entry)"
            @toggle-star="toggleMCPHistoryEntryStar(entry)"
          />
        </div>

        <HoppSmartPlaceholder
          v-else
          :src="`/images/states/${colorMode.value}/time.svg`"
          :alt="`${t('empty.history')}`"
          :text="`${t('empty.history')}`"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import {
  MCPAuth,
  MCPMethodInvocation,
  MCPMethodType,
  getDefaultMCPRequest,
  makeMCPRequest,
} from "@hoppscotch/data"
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { computed, ref } from "vue"
import type { LogEntryData } from "~/components/realtime/Log.vue"
import {
  MCPConnection,
  MCPErrorMessage,
  MCPEvent,
  MCPPrompt,
  MCPResource,
  MCPTool,
  type ConnectionState,
} from "~/helpers/realtime/MCPConnection"
import {
  MCPHTTPAuth,
  MCPHTTPConnection,
} from "~/helpers/realtime/MCPHTTPConnection"
import { MCPSTDIOConnection } from "~/helpers/realtime/MCPSTDIOConnection"
import type { MCPServerEntry } from "~/helpers/mcp/servers"
import {
  MCPAuth$,
  MCPCapabilities$,
  MCPConnection$,
  MCPLog$,
  MCPRequest$,
  MCPTransportType$,
  addMCPLogLine,
  setMCPCapabilities,
  setMCPConnection,
  setMCPLog,
  setMCPRequest,
  setMCPTransportType,
} from "~/newstore/MCPSession"
import { addMCPRequestToCollection } from "~/newstore/collections"
import {
  MCPHistoryEntry,
  addMCPHistoryEntry,
  clearMCPHistory,
  deleteMCPHistoryEntry,
  makeMCPHistoryEntry,
  mcpHistory$,
  toggleMCPHistoryEntryStar,
} from "~/newstore/history"
import IconBookOpen from "~icons/lucide/book-open"
import IconHistory from "~icons/lucide/history"
import IconSave from "~icons/lucide/save"
import IconTrash2 from "~icons/lucide/trash-2"

type PrimaryTab = "configuration" | "tools" | "prompts" | "resources"
type OutputTab = "logs" | "response"

const EMPTY_AUTH: MCPAuth = {
  authType: "none",
  authActive: false,
}

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const { subscribeToStream } = useStreamSubscriber()

usePageHead({
  title: computed(() => t("navigation.mcp")),
})

const selectedTab = ref<PrimaryTab>("configuration")
const selectedOutputTab = ref<OutputTab>("logs")
const showServerCatalog = ref(false)
const showCollectionsModal = ref(false)
const showHistoryModal = ref(false)
const historyFilter = ref("")
const capabilitiesLoading = ref(false)
const latestResponse = ref("")
const connectionState = ref<ConnectionState>("DISCONNECTED")

const request = useReadonlyStream(MCPRequest$, getDefaultMCPRequest(), "deep")
const transportType = useStream(MCPTransportType$, "http", setMCPTransportType)
const auth = useReadonlyStream(MCPAuth$, EMPTY_AUTH, "deep")
const connection = useStream(
  MCPConnection$,
  new MCPHTTPConnection("", { type: "none" }),
  setMCPConnection
)
const capabilities = useStream(MCPCapabilities$, null, setMCPCapabilities)
const log = useStream(MCPLog$, [], setMCPLog)
const history = useReadonlyStream(mcpHistory$, [], "deep")

const tools = computed(() => capabilities.value?.tools ?? [])
const prompts = computed(() => capabilities.value?.prompts ?? [])
const resources = computed(() => capabilities.value?.resources ?? [])

const filteredHistory = computed(() => {
  if (!historyFilter.value.trim()) {
    return history.value
  }

  const query = historyFilter.value.toLowerCase()

  return history.value.filter((entry) => {
    const searchableParts = [
      entry.request.name,
      entry.request.method.methodType ?? "",
      entry.request.method.methodName,
      entry.request.method.arguments,
      entry.request.httpConfig?.url ?? "",
      entry.request.stdioConfig?.command ?? "",
      entry.response,
    ]

    return searchableParts.some((value) => value.toLowerCase().includes(query))
  })
})

const connectionTarget = computed(() => {
  if (transportType.value === "http") {
    return request.value.httpConfig?.url?.trim() || t("mcp.configuration")
  }

  const command = request.value.stdioConfig?.command?.trim() ?? ""
  const args = request.value.stdioConfig?.args.join(" ") ?? ""

  return `${command} ${args}`.trim() || t("mcp.configuration")
})

const isConfigValid = computed(() => {
  if (transportType.value === "http") {
    return (request.value.httpConfig?.url?.trim().length ?? 0) > 0
  }

  return (request.value.stdioConfig?.command?.trim().length ?? 0) > 0
})

const getErrorMessage = (error: MCPErrorMessage) =>
  error instanceof Error ? error.message : `${error}`

const formatResponse = (value: unknown) => {
  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch (_error) {
    return `${value}`
  }
}

const mapMethodTypeToTab = (methodType: MCPMethodType | null): PrimaryTab => {
  switch (methodType) {
    case "tool":
      return "tools"
    case "prompt":
      return "prompts"
    case "resource":
      return "resources"
    default:
      return "configuration"
  }
}

const getRequestName = (method: MCPMethodInvocation) => {
  if (
    request.value.name.trim() &&
    request.value.name !== "Untitled MCP Request"
  ) {
    return request.value.name
  }

  switch (method.methodType) {
    case "tool":
      return method.methodName
        ? `Tool: ${method.methodName}`
        : getDefaultMCPRequest().name
    case "prompt":
      return method.methodName
        ? `Prompt: ${method.methodName}`
        : getDefaultMCPRequest().name
    case "resource":
      return method.methodName
        ? `Resource: ${method.methodName}`
        : getDefaultMCPRequest().name
    default:
      return getDefaultMCPRequest().name
  }
}

const buildRequest = (method = request.value.method) => {
  const { v: _version, ...rest } = request.value

  return makeMCPRequest({
    ...rest,
    name: getRequestName(method),
    method,
  })
}

const buildHTTPAuth = (value: MCPAuth): MCPHTTPAuth => {
  if (!value.authActive) {
    return { type: "none" }
  }

  switch (value.authType) {
    case "basic":
      return {
        type: "basic",
        username: value.username,
        password: value.password,
      }
    case "bearer":
      return {
        type: "bearer",
        token: value.token,
      }
    case "api-key":
      return {
        type: "api-key",
        key: value.key,
        value: value.value,
        addTo: value.addTo,
      }
    case "none":
    default:
      return { type: "none" }
  }
}

const attachConnection = (target: MCPConnection) => {
  connectionState.value = target.connectionState$.value
  capabilities.value = target.capabilities$.value

  subscribeToStream(target.connectionState$, (state) => {
    connectionState.value = state
  })

  subscribeToStream(target.capabilities$, (nextCapabilities) => {
    capabilities.value = nextCapabilities
  })

  subscribeToStream(target.event$, handleMCPEvent)
}

const switchTransport = (type: "http" | "stdio") => {
  if (connectionState.value !== "DISCONNECTED") {
    toast.error(`${t("mcp.disconnect_before_switching")}`)
    return
  }

  transportType.value = type
}

const clearLogEntries = () => {
  log.value = []
}

const clearLatestResponse = () => {
  latestResponse.value = ""
}

const handleMCPEvent = (event: MCPEvent) => {
  switch (event.type) {
    case "CONNECTING":
      log.value = [
        {
          payload: `${t("state.connecting_to", { name: connectionTarget.value })}`,
          source: "info",
          color: "var(--accent-color)",
          ts: undefined,
        },
      ]
      break

    case "CONNECTED":
      addMCPLogLine({
        payload: `${t("state.connected_to", { name: connectionTarget.value })}`,
        source: "info",
        color: "var(--accent-color)",
        ts: event.time,
      })
      toast.success(`${t("state.connected")}`)
      break

    case "CAPABILITIES_LOADED":
      addMCPLogLine({
        payload: `${t("mcp.capabilities_loaded")}`,
        source: "info",
        color: "var(--accent-color)",
        ts: event.time,
      })

      if (selectedTab.value === "configuration") {
        if (event.capabilities.tools.length > 0) {
          selectedTab.value = "tools"
        } else if (event.capabilities.prompts.length > 0) {
          selectedTab.value = "prompts"
        } else if (event.capabilities.resources.length > 0) {
          selectedTab.value = "resources"
        }
      }

      break

    case "METHOD_INVOKED":
      addMCPLogLine({
        payload: formatResponse({
          method: event.method,
          arguments: event.arguments,
        }),
        source: "client",
        ts: event.time,
      })
      break

    case "RESPONSE_RECEIVED":
      latestResponse.value = formatResponse(event.response)
      selectedOutputTab.value = "response"
      addMCPLogLine({
        payload: latestResponse.value,
        source: "server",
        ts: event.time,
      })
      break

    case "ERROR":
      addMCPLogLine({
        payload: getErrorMessage(event.error),
        source: "info",
        color: "#ff5555",
        ts: event.time,
      })
      toast.error(getErrorMessage(event.error))
      break

    case "DISCONNECTED":
      addMCPLogLine({
        payload: t("state.disconnected").toString(),
        source: "disconnected",
        color: "#ff5555",
        ts: event.time,
      })

      if (event.manual) {
        toast.success(`${t("state.disconnected")}`)
      } else {
        toast.error(`${t("state.disconnected")}`)
      }
      break
  }
}

const connectToServer = async () => {
  try {
    const nextConnection =
      transportType.value === "http"
        ? new MCPHTTPConnection(
            request.value.httpConfig?.url ?? "",
            buildHTTPAuth(auth.value)
          )
        : new MCPSTDIOConnection({
            command: request.value.stdioConfig?.command ?? "",
            args: request.value.stdioConfig?.args ?? [],
            env: (request.value.stdioConfig?.env ?? [])
              .filter((envVar) => envVar.active)
              .reduce<Record<string, string>>((accumulator, envVar) => {
                if (envVar.key.trim()) {
                  accumulator[envVar.key] = envVar.value
                }
                return accumulator
              }, {}),
          })

    latestResponse.value = ""
    capabilities.value = null
    connection.value = nextConnection
    attachConnection(nextConnection)
    await nextConnection.connect()
  } catch (_error) {}
}

const toggleConnection = async () => {
  if (connectionState.value === "DISCONNECTED") {
    await connectToServer()
    return
  }

  try {
    await connection.value.disconnect()
  } catch (error) {
    toast.error(getErrorMessage(error as Error))
  }
}

const loadCapabilities = async () => {
  if (connectionState.value !== "CONNECTED") {
    return
  }

  capabilitiesLoading.value = true

  try {
    await connection.value.loadCapabilities()
  } catch (error) {
    toast.error(getErrorMessage(error as Error))
  } finally {
    capabilitiesLoading.value = false
  }
}

const persistInvocation = (method: MCPMethodInvocation, response: unknown) => {
  addMCPHistoryEntry(
    makeMCPHistoryEntry({
      request: buildRequest(method),
      response: formatResponse(response),
      star: false,
      updatedOn: new Date(),
    })
  )
}

const invokeTool = async (tool: MCPTool, args: unknown) => {
  const method: MCPMethodInvocation = {
    methodType: "tool",
    methodName: tool.name,
    arguments: formatResponse(args),
  }

  setMCPRequest(buildRequest(method))
  selectedTab.value = "tools"

  try {
    const response = await connection.value.invokeTool(tool.name, args)
    persistInvocation(method, response)
  } catch (_error) {
    // Event stream handles log and toast output.
  }
}

const invokePrompt = async (prompt: MCPPrompt, args: unknown) => {
  const method: MCPMethodInvocation = {
    methodType: "prompt",
    methodName: prompt.name,
    arguments: formatResponse(args),
  }

  setMCPRequest(buildRequest(method))
  selectedTab.value = "prompts"

  try {
    const response = await connection.value.invokePrompt(prompt.name, args)
    persistInvocation(method, response)
  } catch (_error) {
    // Event stream handles log and toast output.
  }
}

const readResource = async (resource: MCPResource) => {
  const payload = {
    uri: resource.uri,
  }

  const method: MCPMethodInvocation = {
    methodType: "resource",
    methodName: resource.uri,
    arguments: formatResponse(payload),
  }

  setMCPRequest(buildRequest(method))
  selectedTab.value = "resources"

  try {
    const response = await connection.value.readResource(resource.uri)
    persistInvocation(method, response)
  } catch (_error) {
    // Event stream handles log and toast output.
  }
}

const saveToCollection = (collectionIndex: number) => {
  addMCPRequestToCollection(collectionIndex, buildRequest())
  showCollectionsModal.value = false
  toast.success(`${t("state.saved")}`)
}

const clearHistoryEntries = () => {
  clearMCPHistory()
  toast.success(`${t("state.history_deleted")}`)
}

const deleteHistoryEntry = (entry: MCPHistoryEntry) => {
  deleteMCPHistoryEntry(entry)
  toast.success(`${t("state.deleted")}`)
}

const useHistoryEntry = (entry: MCPHistoryEntry) => {
  if (connectionState.value !== "DISCONNECTED") {
    toast.error(`${t("mcp.disconnect_before_switching")}`)
    return
  }

  setMCPRequest(entry.request)
  capabilities.value = null
  latestResponse.value = entry.response
  selectedTab.value = mapMethodTypeToTab(entry.request.method.methodType)
  selectedOutputTab.value = "response"
  showHistoryModal.value = false
}

const historyKey = (entry: MCPHistoryEntry) =>
  `${entry.id ?? entry.updatedOn ?? entry.request.name}-${entry.request.method.methodName}`

const handleServerSelect = (server: MCPServerEntry) => {
  if (
    connectionState.value !== "DISCONNECTED" &&
    server.transport !== transportType.value
  ) {
    toast.error(`${t("mcp.disconnect_before_switching")}`)
    return
  }

  transportType.value = server.transport

  const nextRequest = makeMCPRequest({
    name: request.value.name,
    transportType: server.transport,
    httpConfig:
      server.transport === "http"
        ? {
            url: server.url ?? "",
          }
        : request.value.httpConfig,
    stdioConfig:
      server.transport === "stdio"
        ? {
            command: server.command ?? "",
            args: server.args ?? [],
            env: server.envVars ?? [],
          }
        : request.value.stdioConfig,
    auth:
      server.transport === "http" ? (server.auth ?? EMPTY_AUTH) : EMPTY_AUTH,
    method: request.value.method,
  })

  setMCPRequest(nextRequest)
  selectedTab.value = "configuration"
  showServerCatalog.value = false
  toast.success(`${t("mcp.server_loaded")}`)
}

attachConnection(connection.value)
</script>
