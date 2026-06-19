<template>
  <GqlExplorerSection v-if="interfaces.length > 0" title="Implements">
    <div
      v-for="implementedInterface in interfaces"
      :key="implementedInterface.name"
      class="px-4 py-2 transition hover:bg-primaryLight"
    >
      <GqlTypeLink :type="implementedInterface" :clickable="true" />
    </div>
  </GqlExplorerSection>
</template>

<script setup lang="ts">
import { defineProps, computed } from "vue"
import { isObjectType, GraphQLNamedType } from "graphql"

const props = defineProps<{
  type: GraphQLNamedType
}>()

const interfaces = computed(() => {
  if (!isObjectType(props.type)) {
    return []
  }
  return props.type.getInterfaces()
})
</script>
