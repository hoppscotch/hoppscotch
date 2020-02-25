<template>
  <div class="type-box">
    <div class="type-title">{{ gqlType.name }}</div>
    <div class="type-desc" v-if="gqlType.description">
      {{ gqlType.description }}
    </div>

    <div v-if="gqlType.getFields">
      <h5>{{ $t("fields") }}</h5>
      <div v-for="field in gqlType.getFields()" :key="field.name">
        <gql-field :gqlField="field" :jumpTypeCallback="jumpTypeCallback" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type-box {
  padding: 16px;
  margin: 4px 0;
}

.type-desc {
  color: var(--fg-light-color);
  margin-top: 4px;
}

.type-title {
  font-weight: 700;
}
</style>

<script>
export default {
  components: {
    "gql-field": () => import("./field")
  },

  props: {
    gqlType: {},
    jumpTypeCallback: Function
  }
};
</script>
