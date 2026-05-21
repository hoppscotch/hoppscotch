<template>
  <span class="inline-flex items-center gap-1.5">
    <button
      v-if="showAddField"
      class="flex items-center justify-center rounded transition hover:text-accent"
      :class="{ 'text-accent': isAdded, 'text-secondaryLight': !isAdded }"
      type="button"
      @click.stop="addField"
    >
      <icon-lucide-plus-circle v-if="!isAdded" class="svg-icons" />
      <icon-lucide-circle-check v-else class="svg-icons" />
    </button>
    <span
      class="hopp-doc-explorer-field-name text-sm font-medium"
      @click="clickable ? handleClick : undefined"
    >
      {{ field.name }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { type ExplorerFieldDef, useExplorer } from "~/helpers/graphql/explorer"
import { debounce } from "lodash-es"

const props = withDefaults(
  defineProps<{
    field: ExplorerFieldDef
    clickable?: boolean
    showAddField: boolean
    isAdded?: boolean
  }>(),
  {
    clickable: true,
    showAddField: true,
    isAdded: false,
  }
)

const emit = defineEmits<{
  (event: "add-field", field: ExplorerFieldDef): void
}>()

const addField = debounce(() => {
  emit("add-field", props.field)
}, 50)

const { push } = useExplorer()

const handleClick = (event: MouseEvent) => {
  event.preventDefault()
  push({ name: props.field.name, def: props.field })
}
</script>
