<template>
  <div :id="`type_${gqlType.name}`" class="p-2 m-2">
    <div class="font-bold type-title" :class="{ 'type-highlighted': isHighlighted }">
      <span v-if="isInput" class="font-normal text-acColor">input </span>
      <span v-else-if="isInterface" class="font-normal text-acColor">interface </span>
      <span v-else-if="isEnum" class="font-normal text-acColor">enum </span>
      {{ gqlType.name }}
    </div>
    <div class="mt-2 text-fgLightColor type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>
    <div v-if="interfaces.length > 0" class="mb-2">
      <h5>{{ $t("interfaces") }}</h5>
      <div v-for="gqlInterface in interfaces" :key="gqlInterface.name" class="m-2 ml-4">
        <GraphqlTypeLink :gqlType="gqlInterface" :jumpTypeCallback="jumpTypeCallback" />
      </div>
    </div>
    <div v-if="children.length > 0" class="mb-2">
      <h5>{{ $t("children") }}</h5>
      <div v-for="child in children" :key="child.name" class="m-2 ml-4">
        <GraphqlTypeLink :gqlType="child" :jumpTypeCallback="jumpTypeCallback" />
      </div>
    </div>
    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <GraphqlField
          :gqlField="field"
          :isHighlighted="isFieldHighlighted({ field })"
          :jumpTypeCallback="jumpTypeCallback"
        />
      </div>
    </div>
    <div v-if="isEnum">
      <h5>{{ $t("values") }}</h5>
      <div :key="value.name" v-for="value in gqlType.getValues()" class="m-4" v-text="value.name" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-highlighted {
  @apply text-acColor;
}
</style>

<script>
import { GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType } from "graphql"

export default {
  props: {
    gqlType: {},
    gqlTypes: Array,
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
    isInterface() {
      return this.gqlType instanceof GraphQLInterfaceType
    },
    isEnum() {
      return this.gqlType instanceof GraphQLEnumType
    },
    interfaces() {
      return (this.gqlType.getInterfaces && this.gqlType.getInterfaces()) || []
    },
    children() {
      return this.gqlTypes.filter(
        (type) => type.getInterfaces && type.getInterfaces().includes(this.gqlType)
      )
    },
  },
}
</script>
