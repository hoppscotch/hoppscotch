<template>
  <div class="whitespace-pre-wrap font-mono text-sm">
    <VueJsonPretty
      v-if="isObjectOrArray"
      :data="parsedValue"
      :theme="treeViewTheme"
      :deep="2"
      class="p-4"
      :class="snippetColors"
    />

    <pre
      v-else-if="parsedJSON"
      class="overflow-auto max-h-96 p-4"
      :class="[snippetColors, formattedJSONViewHoverClasses]"
      >{{ formattedJSONString }}
    </pre>

    <pre v-else
      >{{ formattedPrimitive }}
    </pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import VueJsonPretty from "vue-json-pretty"

import "vue-json-pretty/lib/styles.css"
import { useColorMode } from "~/composables/theming"

const props = defineProps<{ value: unknown }>()

const theme = useColorMode()

const isObjectOrArray = computed(
  () => typeof props.value === "object" && props.value !== null
)

const parsedJSON = computed(() => {
  if (typeof props.value !== "string") {
    return null
  }

  try {
    const parsed = JSON.parse(props.value)
    return typeof parsed === "object" && parsed !== null ? parsed : null
  } catch {
    return null
  }
})

const parsedValue = computed(() =>
  isObjectOrArray.value ? props.value : parsedJSON.value
)

const formattedJSONString = computed(() => {
  if (typeof props.value !== "string") {
    return ""
  }

  if (parsedJSON.value) {
    // Return the original string if it looks already formatted
    const hasNewlines = props.value.includes("\n")
    const hasIndentation = props.value.match(/^\s{2,}["[{]/m) !== null

    if (hasNewlines || hasIndentation) {
      return props.value
    }

    return JSON.stringify(parsedJSON.value, null, 2)
  }

  return props.value
})

const formattedPrimitive = computed(() => {
  const val = props.value

  if (typeof val === "string") {
    return val
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return String(val)
  }

  if (val === null) {
    return "null"
  }

  if (val === undefined) {
    return "undefined"
  }

  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return "[Unserializable]"
  }
})

const isDarkTheme = computed(() => ["dark", "black"].includes(theme.value))

const treeViewTheme = computed(() => (isDarkTheme.value ? "dark" : "light"))

const snippetColors = computed(() =>
  isDarkTheme.value
    ? "bg-gray-900 text-gray-100 !border-gray-700"
    : "border rounded-md bg-gray-50 !border-gray-200"
)

const formattedJSONViewHoverClasses = computed(() =>
  isDarkTheme.value ? "hover:bg-gray-800" : "hover:bg-gray-100"
)
</script>
