<template>
  <slot :data="data" :toggle-children="toggleChildren"> </slot>
  <slot name="child" :node-data="data" :toggle-node-children="toggleChildren">
  </slot>
  <div v-if="showChildren">
    <div
      v-for="child in adapter.getChildren(data.id)"
      :key="child.id"
      class="bg-red-500 p-2 mx-5"
    >
      <TreeBranch v-if="child" :data="child" :adapter="adapter">
        <template #child="{ nodeData, toggleNodeChildren }">
          <h2 class="bg-orange-200 p-2" @click="toggleNodeChildren">
            {{ nodeData.name }} - {{ nodeData.id }}
          </h2>
        </template>
      </TreeBranch>
      <div v-else>sdsd</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"

defineProps<{
  adapter: SmartTreeAdapter<any>
  data: any
}>()

const showChildren = ref(false)

const toggleChildren = () => {
  showChildren.value = !showChildren.value
}
</script>
