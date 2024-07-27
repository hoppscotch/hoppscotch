<template>
  <div class="block-menu">
    <HoppSmartInput
      v-model="filterText"
      placeholder="Search for blocks or requests"
      class="search-input"
    ></HoppSmartInput>
    <div v-if="filteredNodes.length" class="search-results">
      <div
        v-for="node in filteredNodes"
        :key="node"
        :value="node"
        class="search-result"
      >
        <div class="search-result-icon">
          <component :is="node.icon" class="svg-icons" />
        </div>
        <div>
          <div>{{ node.title }}</div>
          <div>{{ node.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
})
const nodesList = props.data.nodes
const filterText = ref("")
const filteredNodes = computed(() => {
  if (!nodesList.length) return []
  const filterTextValue = filterText.value.toLowerCase()
  return filterTextValue.length
    ? nodesList.filter((node) =>
        node.title.toLowerCase().includes(filterTextValue)
      )
    : nodesList
})
</script>

<style scoped lang="scss">
.block-menu {
  @apply bg-primary;
}
.search-result {
  @apply flex items-center gap-4 border-0 rounded;
  &:hover {
    @apply bg-primaryDark;
  }
}
.search-result-icon {
  @apply p-4;
}
.block-menu,
.search-result-icon {
  @apply border rounded border-current;
}
.block-menu,
.search-input,
.search-result {
  @apply p-2;
}
</style>
