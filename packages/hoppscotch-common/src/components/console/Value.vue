<template>
  <div class="whitespace-pre-wrap font-mono text-[12px] select-text">
    <VueJsonPretty
      v-if="isObjectOrArray"
      :data="parsedValue"
      :theme="treeViewTheme"
      :show-line="false"
      :show-line-numbers="true"
      :deep="2"
      class="p-4 bg-primary text-secondaryDark border !border-dividerLight !text-[12px] rounded !font-mono select-text"
    />

    <pre
      v-else-if="parsedJSON"
      class="overflow-auto max-h-96 p-4 bg-primary text-secondaryDark border !border-dividerLight rounded select-text"
      >{{ formattedJSONString }}
    </pre>

    <pre v-else class="truncate select-text"
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
</script>

<style>
.vjs-tree-node.is-highlight,
.vjs-tree-node:hover {
  background-color: var(--primary-light-color) !important;
  color: var(--secondary-dark-color) !important;
}
</style>

<style scoped>
/* Force scrollbars to always be visible (override macOS auto-hide) */
pre {
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: var(--divider-color) transparent; /* Firefox: thumb track */
}

pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  background: var(--divider-color);
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: var(--secondary-light-color);
}
</style>
