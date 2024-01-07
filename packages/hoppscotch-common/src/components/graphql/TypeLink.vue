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
  // We can't do !== here because it's possible to have a type that is not null or undefined but still not have an ofType property
  while (t.ofType != null) t = t.ofType
  return t
}

function jumpToType() {
  if (isScalar.value) return
  emit("jump-to-type", props.gqlType)
}
</script>
