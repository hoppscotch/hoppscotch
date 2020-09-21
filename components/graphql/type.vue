<template>
  <div class="type-box">
    <div class="type-title">{{ gqlType.name }}</div>
    <div class="type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>

    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <field :gqlField="field" :jumpTypeCallback="jumpTypeCallback" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-box {
  @apply p-8;
  @apply my-2;
}

.type-desc {
  @apply text-fgLightColor;
  @apply mt-2;
}

.type-title {
  @apply font-bold;
}
</style>

<script>
export default {
  props: {
    gqlType: {},
    jumpTypeCallback: Function,
  },
}
</script>
