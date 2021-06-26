<template>
  <div class="p-2 m-2 border-b border-dashed border-divider">
    <div class="field-title" :class="{ 'field-highlighted': isHighlighted }">
      {{ fieldName }}
      <span v-if="fieldArgs.length > 0">
        (
        <span v-for="(field, index) in fieldArgs" :key="index">
          {{ field.name }}:
          <GraphqlTypeLink
            :gql-type="field.type"
            :jump-type-callback="jumpTypeCallback"
          />
          <span v-if="index !== fieldArgs.length - 1"> , </span>
        </span>
        ) </span
      >:
      <GraphqlTypeLink
        :gql-type="gqlField.type"
        :jump-type-callback="jumpTypeCallback"
      />
    </div>
    <div
      v-if="gqlField.description"
      class="py-2 text-sm text-secondaryLight field-desc"
    >
      {{ gqlField.description }}
    </div>
    <div
      v-if="gqlField.isDeprecated"
      class="
        inline-block
        px-4
        py-2
        my-2
        text-sm
        font-bold
        text-black
        bg-yellow-200
        rounded-lg
        field-deprecated
      "
    >
      {{ $t("deprecated") }}
    </div>
    <div v-if="fieldArgs.length > 0">
      <h5 class="my-2 text-xs">ARGUMENTS:</h5>
      <div class="px-4 border-l-2 border-accent">
        <div v-for="(field, index) in fieldArgs" :key="index">
          {{ field.name }}:
          <GraphqlTypeLink
            :gql-type="field.type"
            :jump-type-callback="jumpTypeCallback"
          />
          <div
            v-if="field.description"
            class="py-2 text-sm text-secondaryLight field-desc"
          >
            {{ field.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    gqlField: { type: Object, default: () => {} },
    jumpTypeCallback: { type: Function, default: () => {} },
    isHighlighted: { type: Boolean, default: false },
  },
  computed: {
    fieldName() {
      return this.gqlField.name
    },

    fieldArgs() {
      return this.gqlField.args || []
    },
  },
}
</script>

<style scoped lang="scss">
.field-highlighted {
  @apply border-b-2 border-accent;
}
</style>
