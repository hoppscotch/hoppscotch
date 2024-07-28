<template>
  <component :is="blocksList[blockId - 1].block" v-if="blockId" />
  <div v-else class="block-menu">
    <HoppSmartInput
      v-model="filterText"
      placeholder="Search for blocks or requests"
      class="search-input"
    />
    <div v-if="filteredBlocks.length" class="search-results">
      <div
        v-for="block in filteredBlocks"
        :key="block.id"
        class="search-result"
        @click="setBlockId(block.id)"
      >
        <div class="search-result-icon">
          <component :is="block.icon" class="svg-icons" />
        </div>
        <div>
          <div>{{ block.title }}</div>
          <div>{{ block.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { DefineComponent, FunctionalComponent, SVGAttributes } from "vue"
interface IBlockData {
  id?: number
  title: string
  description: string
  icon: FunctionalComponent<SVGAttributes>
  block: DefineComponent
}
interface IBlocks {
  blocks: IBlockData[]
}
interface IBlockMenuProps {
  id?: string
  data: IBlocks
}
const props = defineProps<IBlockMenuProps>()
const blockId = ref(0)
const setBlockId = (value?: number) => value && (blockId.value = value)
const filterText = ref("")
const blocksList = props.data.blocks.map((blockObj, idx) => ({
  id: idx + 1,
  ...blockObj,
}))
const filteredBlocks = computed(() => {
  if (!blocksList.length) return []
  const filterTextValue = filterText.value.toLowerCase()
  return filterTextValue.length
    ? blocksList.filter((block) =>
        block.title.toLowerCase().includes(filterTextValue)
      )
    : blocksList
})
</script>

<style scoped lang="scss">
.block-menu,
.search-input,
.search-results,
.search-result,
.search-result-icon,
.clicked-result {
  @apply p-2;
}
.block-menu,
.search-result-icon {
  @apply border rounded border-current;
}
.block-menu {
  @apply bg-primary;
}
.search-result {
  @apply flex items-center gap-2 border-0 rounded;
  &:hover,
  &.active {
    @apply bg-primaryDark;
    @apply text-secondaryDark;
    @apply cursor-pointer;
  }
}
</style>
