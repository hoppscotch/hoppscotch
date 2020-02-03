<template>
  <span>
    <span class="argumentName">
      {{ argName }}
    </span>
    :
    <typelink :type="argType" :jumpTypeCallback="jumpCallback" />
  </span>
</template>

<style scoped lang="scss"></style>

<script>
import typelink from "./typelink";

export default {
  components: {
    typelink: typelink
  },

  props: {
    gqlArg: Object
  },

  computed: {
    argName() {
      return this.gqlArg.name;
    },
    argType() {
      return this.gqlArg.type;
    }
  },

  methods: {
    jumpCallback(typeName) {}
  }
};
</script>
