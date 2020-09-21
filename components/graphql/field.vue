<template>
  <div class="field-box">
    <div class="field-title">
      {{ fieldName }}
      <span v-if="fieldArgs.length > 0">
        (
        <span v-for="(field, index) in fieldArgs" :key="index">
          {{ field.name }}:
          <typelink :gqlType="field.type" :jumpTypeCallback="jumpTypeCallback" />
          <span v-if="index !== fieldArgs.length - 1"> , </span>
        </span>
        ) </span
      >:
      <typelink :gqlType="gqlField.type" :jumpTypeCallback="jumpTypeCallback" />
    </div>
    <div class="field-desc" v-if="gqlField.description">
      {{ gqlField.description }}
    </div>

    <div class="field-deprecated" v-if="gqlField.isDeprecated">
      {{ $t("deprecated") }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.field-box {
  @apply p-4;
  @apply m-2;
  @apply border-b;
  @apply border-brdColor;
  @apply border-dashed;
}

.field-deprecated {
  @apply bg-yellow-200;
  @apply text-black;
  @apply inline-block;
  @apply py-2;
  @apply px-4;
  @apply my-2;
  @apply rounded-lg;
  @apply text-sm;
  @apply font-bold;
}

.field-desc {
  @apply text-fgLightColor;
  @apply mt-2;
}
</style>

<script>
export default {
  props: {
    gqlField: Object,
    jumpTypeCallback: Function,
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
