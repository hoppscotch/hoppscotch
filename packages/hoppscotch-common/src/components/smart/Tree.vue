<template>
  <div class="flex flex-col gap-5">
    <slot> </slot>
  </div>
</template>

<script setup lang="ts">
import { onMounted, PropType, ref } from "vue"
import SmartTreeAdapter from "~/helpers/tree/SmartTreeAdapter"

const props = defineProps({
  adapter: {
    type: Object as PropType<SmartTreeAdapter>,
    required: true,
  },
  transformFunction: {
    type: Function as PropType<(data: any) => any>,
    required: true,
  },
})

const transformedData = ref()

onMounted(() => {
  transformedData.value = props.adapter.treeData.value.map(
    props.transformFunction
  )
  console.log("transformed-data", transformedData.value)
  props.adapter.setTreeData(JSON.parse(JSON.stringify(transformedData.value)))
})
</script>
