<template>
  <div v-if="isNamedType(type)" class="flex flex-col">
    <AppMarkdown
      v-if="type.description"
      type="description"
      class="text-secondary leading-relaxed px-4 py-3"
    >
      {{ type.description }}
    </AppMarkdown>
    <GqlImplementsInterfaces :type="type" />
    <GqlFields :type="type" :insert-query="false" :show-add-field="!readonly" />
    <GqlEnumValues :type="type" />
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue"
import { GraphQLNamedType, isNamedType } from "graphql"

defineProps<{
  type: GraphQLNamedType
  readonly?: boolean
}>()
</script>
