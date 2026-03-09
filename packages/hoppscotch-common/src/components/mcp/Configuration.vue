<template>
  <div class="flex flex-col flex-1">
    <!-- HTTP Configuration -->
    <div v-if="transportType === 'http'" class="flex flex-col">
      <!-- HTTP URL -->
      <div
        class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("mcp.url") }}
        </label>
      </div>
      <div class="p-4">
        <input
          v-model="httpUrl"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('mcp.url')"
          type="url"
        />
      </div>

      <!-- HTTP Authentication -->
      <div
        class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("authorization.type") }}
        </label>
      </div>
      <MCPHTTPAuth />
    </div>

    <!-- STDIO Configuration -->
    <div v-if="transportType === 'stdio'" class="flex flex-col">
      <!-- Command -->
      <div
        class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("mcp.command") }}
        </label>
      </div>
      <div class="p-4 space-y-2">
        <input
          v-model="stdioCommand"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('mcp.server_command_placeholder')"
          type="text"
        />
        <p class="text-xs text-secondaryLight">
          Full command including arguments (e.g., npx -y
          @modelcontextprotocol/server-filesystem /path/to/dir)
        </p>
      </div>

      <!-- Environment Variables -->
      <div
        class="sticky top-upperSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("mcp.environment_variables") }}
        </label>
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.clear_all')"
            :icon="IconTrash2"
            @click="clearAllEnvVars"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('add.new')"
            :icon="IconPlus"
            @click="addEnvVar"
          />
        </div>
      </div>
      <MCPEnvVarsList />

      <!-- STDIO Warning -->
      <div
        class="flex items-start space-x-2 text-amber-500 text-sm p-4 bg-amber-50 dark:bg-amber-900/10 border-t border-dividerLight"
      >
        <icon-lucide-alert-circle class="svg-icons mt-0.5 flex-shrink-0" />
        <div class="flex flex-col space-y-1">
          <span class="font-semibold">{{ t("mcp.stdio_requires_agent") }}</span>
          <span>
            STDIO transport requires spawning processes, which is not available
            in browsers. Please use Hoppscotch Desktop App or install the
            Hoppscotch Agent.
          </span>
        </div>
      </div>
    </div>

    <!-- Load Capabilities Button -->
    <div
      class="flex items-center justify-center p-4 border-t border-dividerLight"
    >
      <HoppButtonPrimary
        :label="
          capabilitiesLoading
            ? t('mcp.loading_capabilities')
            : t('mcp.load_capabilities')
        "
        :loading="capabilitiesLoading"
        :disabled="isConnected !== 'CONNECTED' || capabilitiesLoading"
        @click="loadCapabilities"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlus from "~icons/lucide/plus"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import { useI18n } from "@composables/i18n"
import { useStream, useStreamSubscriber } from "@composables/stream"
import {
  MCPTransportType$,
  MCPHTTPConfig$,
  MCPSTDIOConfig$,
  MCPConnection$,
  setMCPHTTPConfig,
  setMCPSTDIOConfig,
  addMCPEnvVar,
  deleteAllMCPEnvVars,
} from "~/newstore/MCPSession"
import MCPHTTPAuth from "./HTTPAuth.vue"
import MCPEnvVarsList from "./EnvVarsList.vue"

const t = useI18n()
const { subscribeToStream } = useStreamSubscriber()

const transportType = useStream(MCPTransportType$, "http", () => {})
const httpConfig = useStream(MCPHTTPConfig$, null, setMCPHTTPConfig)
const stdioConfig = useStream(MCPSTDIOConfig$, null, setMCPSTDIOConfig)
const connection = useStream(MCPConnection$, null as any, () => {})

const httpUrl = ref("")
const stdioCommand = ref("")
const capabilitiesLoading = ref(false)
const isConnected = ref<"DISCONNECTED" | "CONNECTING" | "CONNECTED">(
  "DISCONNECTED"
)

// Watch connection and subscribe to its state
watch(
  connection,
  (newConnection) => {
    if (newConnection?.connectionState$) {
      subscribeToStream(newConnection.connectionState$, (state) => {
        isConnected.value = state
      })
    } else {
      isConnected.value = "DISCONNECTED"
    }
  },
  { immediate: true }
)

watch(
  httpConfig,
  (config) => {
    if (config) {
      httpUrl.value = config.url
    }
  },
  { immediate: true }
)

watch(
  stdioConfig,
  (config) => {
    if (config) {
      stdioCommand.value = config.command
    }
  },
  { immediate: true }
)

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
      env: stdioConfig.value?.env || [],
    })
  }
})

const addEnvVar = () => {
  addMCPEnvVar({
    key: "",
    value: "",
    active: true,
  })
}

const clearAllEnvVars = () => {
  deleteAllMCPEnvVars()
}

const loadCapabilities = async () => {
  if (connection.value && isConnected.value === "CONNECTED") {
    capabilitiesLoading.value = true
    try {
      await connection.value.loadCapabilities()
    } finally {
      capabilitiesLoading.value = false
    }
  }
}
</script>
