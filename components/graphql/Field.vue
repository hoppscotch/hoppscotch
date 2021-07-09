<template>
  <div>
    <div
      class="font-bold text-xs field-title"
      :class="{ 'field-highlighted': isHighlighted }"
    >
      {{ fieldName }}
      <span v-if="fieldArgs.length > 0">
        (
        <span v-for="(field, index) in fieldArgs" :key="index">
          {{ field.name }}:
          <GraphqlTypeLink
            :gql-type="field.type"
            :jump-type-callback="jumpTypeCallback"
          />
          <span v-if="index !== fieldArgs.length - 1">, </span>
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
      class="py-2 text-xs text-secondaryLight field-desc"
    >
      {{ gqlField.description }}
    </div>
    <div
      v-if="gqlField.isDeprecated"
      class="
        inline-block
        px-2
        py-1
        my-1
        text-xs text-black
        bg-yellow-200
        rounded
        font-bold
        field-deprecated
      "
    >
      {{ $t("deprecated") }}
    </div>
    <div v-if="fieldArgs.length > 0">
      <h5 class="my-2 text-xs">Arguments:</h5>
      <div class="pl-4 border-l-2 border-divider">
        <div v-for="(field, index) in fieldArgs" :key="index">
          <span class="font-bold text-xs">
            {{ field.name }}:
            <GraphqlTypeLink
              :gql-type="field.type"
              :jump-type-callback="jumpTypeCallback"
            />
          </span>
          <div
            v-if="field.description"
            class="py-2 text-xs text-secondaryLight field-desc"
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
