<template>
  <span
    :class="isScalar ? 'text-secondaryLight' : 'cursor-pointer text-accent'"
    @click="jumpToType"
  >
    {{ typeString }}
  </span>
</template>

<script setup lang="ts">
import { GraphQLScalarType, GraphQLType } from "graphql"
import { computed } from "vue"

const props = defineProps<{
  gqlType: GraphQLType
}>()

const emit = defineEmits<{
  (e: "jump-to-type", type: GraphQLType): void
}>()

const typeString = computed(() => `${props.gqlType}`)
const isScalar = computed(() => {
  return resolveRootType(props.gqlType) instanceof GraphQLScalarType
})

function resolveRootType(type: GraphQLType) {
  let t = type as any
  while (t.ofType != null) t = t.ofType
  return t
}

function jumpToType() {
  if (isScalar.value) return
  emit("jump-to-type", props.gqlType)
}
</script>
