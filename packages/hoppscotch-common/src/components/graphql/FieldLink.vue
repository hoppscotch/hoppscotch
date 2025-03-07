<template>
  <p class="inline-flex items-center align-bottom">
    <span
      v-if="showAddField"
      class="hover:text-accent cursor-pointer flex items-center justify-center px-4 py-2"
      :class="{ 'text-accent': isAdded }"
      @click.stop="addField"
    >
      <icon-lucide-plus-circle v-if="!isAdded" class="svg-icons" />
      <icon-lucide-circle-check v-else class="svg-icons" />
    </span>
    <span
      class="hopp-doc-explorer-field-name [text-decoration:inherit] text-sm py-2 font-normal"
      @click="clickable ? handleClick : undefined"
    >
      {{ field.name }}
    </span>
  </p>
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
