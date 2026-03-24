<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-0 z-10 border-b border-dividerLight bg-primary px-4 py-3"
    >
      <div class="flex items-center justify-between">
        <label class="font-semibold text-secondaryLight">
          {{ transportType === "http" ? t("mcp.http") : t("mcp.stdio") }}
        </label>
        <HoppButtonSecondary
          :label="
            capabilitiesLoading
              ? t('mcp.loading_capabilities')
              : t('mcp.load_capabilities')
          "
          :loading="capabilitiesLoading"
          :disabled="connectionState !== 'CONNECTED' || capabilitiesLoading"
          @click="emit('load-capabilities')"
        />
      </div>
    </div>

    <div v-if="transportType === 'http'" class="space-y-4 p-4">
      <HoppSmartInput
        v-model="httpUrl"
        placeholder=" "
        :label="t('mcp.url')"
        input-styles="floating-input"
      />
      <div class="overflow-hidden rounded border border-dividerLight">
        <McpHTTPAuth />
      </div>
    </div>

    <div v-else class="space-y-4 p-4">
      <HoppSmartInput
        v-model="stdioCommand"
        placeholder=" "
        :label="t('mcp.command')"
        input-styles="floating-input"
      />
      <HoppSmartInput
        v-model="stdioArguments"
        placeholder=" "
        :label="t('mcp.arguments')"
        input-styles="floating-input"
      />

      <div class="overflow-hidden rounded border border-dividerLight">
        <div
          class="flex items-center justify-between border-b border-dividerLight bg-primary px-4 py-3"
        >
          <label class="font-semibold text-secondaryLight">
            {{ t("mcp.environment_variables") }}
          </label>
          <div class="flex items-center gap-1">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="deleteAllMCPEnvVars()"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('add.new')"
              :icon="IconPlus"
              @click="
                addMCPEnvVar({
                  key: '',
                  value: '',
                  active: true,
                })
              "
            />
          </div>
        </div>
        <McpEnvVarsList />
      </div>

      <div
        class="flex items-start gap-3 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600"
      >
        <IconAlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div class="space-y-1">
          <p class="font-semibold">{{ t("mcp.stdio_requires_agent") }}</p>
          <p>{{ t("mcp.stdio_requires_agent_description") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import IconPlus from "~icons/lucide/plus"
import IconTrash2 from "~icons/lucide/trash-2"
import IconAlertCircle from "~icons/lucide/alert-circle"
import { MCPHTTPConfig, MCPSTDIOConfig } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useStream } from "@composables/stream"
import {
  MCPHTTPConfig$,
  MCPSTDIOConfig$,
  MCPTransportType$,
  addMCPEnvVar,
  deleteAllMCPEnvVars,
  setMCPHTTPConfig,
  setMCPSTDIOConfig,
} from "~/newstore/MCPSession"
import type { ConnectionState } from "~/helpers/realtime/MCPConnection"

defineProps<{
  connectionState: ConnectionState
  capabilitiesLoading: boolean
}>()

const emit = defineEmits<{
  (e: "load-capabilities"): void
}>()

const t = useI18n()

const transportType = useStream(MCPTransportType$, "http", () => {})
const httpConfig = useStream<MCPHTTPConfig | null>(
  MCPHTTPConfig$,
  null,
  setMCPHTTPConfig
)
const stdioConfig = useStream<MCPSTDIOConfig | null>(
  MCPSTDIOConfig$,
  null,
  setMCPSTDIOConfig
)

const httpUrl = ref("")
const stdioCommand = ref("")
const stdioArguments = ref("")

watch(
  httpConfig,
  (config) => {
    httpUrl.value = config?.url ?? ""
  },
  { immediate: true }
)

watch(
  stdioConfig,
  (config) => {
    stdioCommand.value = config?.command ?? ""
    stdioArguments.value = (config?.args ?? []).join(" ")
  },
  { immediate: true }
)

watch(httpUrl, (url) => {
  if (transportType.value !== "http") {
    return
  }

  setMCPHTTPConfig({
    url,
  })
})

watch([stdioCommand, stdioArguments], ([command, args]) => {
  if (transportType.value !== "stdio") {
    return
  }

  setMCPSTDIOConfig({
    command,
    args: splitArgs(args),
    env: stdioConfig.value?.env ?? [],
  })
})

const splitArgs = (value: string) =>
  value.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g)?.map(stripWrappingQuotes) ?? []

const stripWrappingQuotes = (value: string) => value.replace(/^["']|["']$/g, "")
</script>
