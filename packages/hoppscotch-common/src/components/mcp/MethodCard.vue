<template>
  <div class="flex flex-col p-4 hover:bg-primaryLight">
    <!-- Method Header -->
    <div class="flex items-start justify-between">
      <div class="flex flex-col flex-1 space-y-1">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-secondaryDark">{{
            method.name
          }}</span>
          <span
            class="text-xs text-secondaryLight px-2 py-0.5 bg-primaryDark rounded"
          >
            {{ methodType }}
          </span>
        </div>
        <span v-if="method.description" class="text-sm text-secondaryLight">
          {{ method.description }}
        </span>
      </div>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="showDetails ? t('action.less') : t('action.more')"
        :icon="showDetails ? IconChevronUp : IconChevronDown"
        @click="showDetails = !showDetails"
      />
    </div>

    <!-- Method Details (Expandable) -->
    <div v-if="showDetails" class="mt-4 space-y-4">
      <!-- Input Schema / Arguments -->
      <div v-if="hasParameters" class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("mcp.method_arguments") }}
        </label>
        <div class="bg-primaryDark rounded p-2">
          <pre class="text-xs text-secondaryLight overflow-x-auto">{{
            JSON.stringify(getParametersSchema(), null, 2)
          }}</pre>
        </div>
      </div>

      <!-- Arguments Input -->
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("mcp.method_arguments") }} (JSON)
        </label>
        <textarea
          v-model="argumentsJson"
          class="bg-primaryLight px-4 py-2 border rounded border-divider text-sm font-mono"
          :placeholder="getPlaceholder()"
          rows="6"
        />
        <div v-if="jsonError" class="text-xs text-red-500">
          {{ jsonError }}
        </div>
      </div>

      <!-- Invoke Button -->
      <div class="flex justify-end">
        <HoppButtonPrimary
          :label="t('mcp.invoke')"
          :disabled="!!jsonError"
          @click="handleInvoke"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronUp from "~icons/lucide/chevron-up"
import { useI18n } from "@composables/i18n"

const t = useI18n()

interface Method {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

const props = defineProps<{
  method: Method
  methodType: "tool" | "prompt"
}>()

const emit = defineEmits<{
  invoke: [method: Method, args: unknown]
}>()

const showDetails = ref(false)
const argumentsJson = ref("{}")
const jsonError = ref<string | null>(null)

const hasParameters = computed(() => {
  if (props.methodType === "tool") {
    return (
      props.method.inputSchema &&
      Object.keys(props.method.inputSchema).length > 0
    )
  }
  return props.method.arguments && props.method.arguments.length > 0
})

const getParametersSchema = () => {
  if (props.methodType === "tool") {
    return props.method.inputSchema
  }
  return props.method.arguments?.reduce(
    (acc, arg) => {
      acc[arg.name] = {
        description: arg.description,
        required: arg.required,
      }
      return acc
    },
    {} as Record<string, unknown>
  )
}

const getPlaceholder = () => {
  if (props.methodType === "tool") {
    return '{\n  "param1": "value1",\n  "param2": "value2"\n}'
  }
  const args = props.method.arguments || []
  if (args.length === 0) return "{}"

  const exampleArgs = args.reduce(
    (acc, arg, index) => {
      acc[arg.name] = `value${index + 1}`
      return acc
    },
    {} as Record<string, string>
  )

  return JSON.stringify(exampleArgs, null, 2)
}

watch(argumentsJson, (newValue) => {
  try {
    JSON.parse(newValue)
    jsonError.value = null
  } catch (_error) {
    jsonError.value = "Invalid JSON"
  }
})

const handleInvoke = () => {
  try {
    const args = JSON.parse(argumentsJson.value)
    emit("invoke", props.method, args)
    showDetails.value = false
  } catch (_error) {
    jsonError.value = "Invalid JSON"
  }
}
</script>
