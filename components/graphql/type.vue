<template>
  <div :id="`type_${gqlType.name}`" class="p-2 m-2">
    <div class="font-bold type-title" :class="{ 'type-highlighted': isHighlighted }">
      <span v-if="isInput" class="text-acColor font-normal">input </span>
      {{ gqlType.name }}
    </div>
    <div class="mt-2 text-fgLightColor type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>
    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <field
          :gqlField="field"
          :isHighlighted="isFieldHighlighted({ field })"
          :jumpTypeCallback="jumpTypeCallback"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-highlighted {
  @apply text-acColor;
}
</style>

<script>
import { GraphQLInputObjectType } from "graphql"

export default {
  props: {
    gqlType: {},
    jumpTypeCallback: Function,
    isHighlighted: { type: Boolean, default: false },
    highlightedFields: { type: Array, default: () => [] },
  },
  methods: {
    isFieldHighlighted({ field }) {
      return !!this.highlightedFields.find(({ name }) => name === field.name)
    },
  },
  computed: {
    isInput() {
      return this.gqlType instanceof GraphQLInputObjectType
    },
  },
}
</script>
