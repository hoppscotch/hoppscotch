<template>
  <div class="whitespace-pre-wrap font-mono text-sm">
    <VueJsonPretty
      v-if="isObjectOrArray"
      :data="parsedValue"
      :deep="2"
      :class="snippetColors"
    />

    <pre
      v-else-if="isStringifiedObject"
      class="overflow-auto max-h-96 p-4"
      :class="snippetColors"
      >{{ prettyStringified }}
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

const props = defineProps<{ value: unknown }>()

const snippetColors = `
  border rounded-md bg-gray-50 text-black !border-gray-200
  dark:bg-gray-900 dark:text-gray-100 dark:!border-gray-700
`

const isObjectOrArray = computed(() => {
  return typeof props.value === "object" && props.value !== null
})

const isStringifiedObject = computed(() => {
  if (typeof props.value !== "string") return false
  try {
    const parsed = JSON.parse(props.value)
    return typeof parsed === "object" && parsed !== null
  } catch {
    return false
  }
})

const parsedValue = computed(() => {
  if (isObjectOrArray.value) return props.value

  if (isStringifiedObject.value && typeof props.value === "string") {
    try {
      return JSON.parse(props.value)
    } catch {
      return null
    }
  }

  return null
})

const prettyStringified = computed(() => {
  if (typeof props.value === "string") {
    try {
      const parsed = JSON.parse(props.value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return props.value
    }
  }
  return ""
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
</script>
