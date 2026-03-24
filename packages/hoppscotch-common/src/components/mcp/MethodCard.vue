<template>
  <div class="flex flex-col p-4 hover:bg-primaryLight">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex items-center gap-2">
          <span class="truncate font-semibold text-secondaryDark">
            {{ method.name }}
          </span>
          <span
            class="rounded bg-primaryDark px-2 py-0.5 text-tiny text-secondaryLight"
          >
            {{ methodType }}
          </span>
        </div>
        <p v-if="method.description" class="text-sm text-secondaryLight">
          {{ method.description }}
        </p>
      </div>

      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="showDetails ? t('hide.more') : t('show.more')"
        :icon="showDetails ? IconChevronUp : IconChevronDown"
        @click="showDetails = !showDetails"
      />
    </div>

    <div v-if="showDetails" class="mt-4 space-y-4">
      <div v-if="hasParameters" class="space-y-2">
        <label class="text-tiny font-semibold text-secondaryLight">
          {{ t("mcp.method_arguments") }}
        </label>
        <pre
          class="overflow-x-auto rounded bg-primaryDark p-3 text-xs text-secondaryLight"
          >{{ JSON.stringify(parameterSchema, null, 2) }}</pre
        >
      </div>

      <div class="space-y-2">
        <label class="text-tiny font-semibold text-secondaryLight">
          {{ t("mcp.arguments") }}
        </label>
        <textarea
          v-model="argumentsJson"
          class="w-full rounded border border-divider bg-primaryLight px-4 py-3 font-mono text-sm"
          :placeholder="placeholder"
          rows="8"
        />
        <p v-if="jsonError" class="text-tiny text-red-500">
          {{ jsonError }}
        </p>
      </div>

      <div class="flex justify-end">
        <HoppButtonPrimary
          :label="t('mcp.invoke')"
          :disabled="jsonError !== null"
          @click="handleInvoke"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronUp from "~icons/lucide/chevron-up"
import { MCPPrompt, MCPTool } from "~/helpers/realtime/MCPConnection"
import { useI18n } from "@composables/i18n"

type Method = MCPTool | MCPPrompt

const props = defineProps<{
  method: Method
  methodType: "tool" | "prompt"
}>()

const emit = defineEmits<{
  (e: "invoke", method: Method, args: unknown): void
}>()

const t = useI18n()

const showDetails = ref(false)
const argumentsJson = ref("{}")
const jsonError = ref<string | null>(null)

const hasParameters = computed(() => {
  if (props.methodType === "tool") {
    return Object.keys((props.method as MCPTool).inputSchema ?? {}).length > 0
  }

  return ((props.method as MCPPrompt).arguments?.length ?? 0) > 0
})

const parameterSchema = computed(() => {
  if (props.methodType === "tool") {
    return (props.method as MCPTool).inputSchema
  }

  return ((props.method as MCPPrompt).arguments ?? []).reduce<
    Record<string, { description?: string; required?: boolean }>
  >((accumulator, argument) => {
    accumulator[argument.name] = {
      description: argument.description,
      required: argument.required,
    }

    return accumulator
  }, {})
})

const placeholder = computed(() => {
  if (props.methodType === "tool") {
    return '{\n  "key": "value"\n}'
  }

  const promptArguments = (props.method as MCPPrompt).arguments ?? []

  return JSON.stringify(
    promptArguments.reduce<Record<string, string>>((accumulator, argument) => {
      accumulator[argument.name] = ""
      return accumulator
    }, {}),
    null,
    2
  )
})

watch(argumentsJson, (value) => {
  try {
    JSON.parse(value)
    jsonError.value = null
  } catch (_error) {
    jsonError.value = t("error.json_parsing_failed")
  }
})

const handleInvoke = () => {
  try {
    emit("invoke", props.method, JSON.parse(argumentsJson.value))
  } catch (_error) {
    jsonError.value = t("error.json_parsing_failed")
  }
}
</script>
