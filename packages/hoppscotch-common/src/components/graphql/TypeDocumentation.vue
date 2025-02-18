<template>
  <div v-if="isNamedType(type)">
    <AppMarkdown v-if="type.description" type="description" class="p-4">
      {{ type.description }}
    </AppMarkdown>
    <GraphqlImplementsInterfaces :type="type" />
    <GraphqlFields
      :type="type"
      :insert-query="false"
      :show-add-field="!readonly"
    />
    <GraphqlEnumValues :type="type" />
    <GraphqlPossibleTypes :type="type" />
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
