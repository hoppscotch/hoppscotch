<template>
  <div class="field-box">
    <div class="field-title">{{ fieldString }}</div>
    <div class="field-desc" v-if="gqlField.description">
      {{ gqlField.description }}
    </div>
  </div>
</template>

<style>
.field-box {
  padding: 1em;
  border-radius: 5px;
  border-style: solid;
  border-width: 0.01em;
  border-color: var(--fg-color);
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
.field-title {
  font-weight: bold;
}

.field-desc {
  opacity: 0.7;
  margin-top: 0.5em;
}
</style>

<script>
export default {
  props: {
    gqlField: Object
  },

  computed: {
    fieldString() {
      const args = (this.gqlField.args || []).reduce((acc, arg, index) => {
        return (
          acc +
          `${arg.name}: ${arg.type.toString()}${
            index !== this.gqlField.args.length - 1 ? ", " : ""
          }`
        );
      }, "");
      const argsString = args.length > 0 ? `(${args})` : "";

      return `${
        this.gqlField.name
      }${argsString}: ${this.gqlField.type.toString()}`;
    }
  }
};
</script>
