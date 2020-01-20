<template>
  <form @submit.prevent="formPost">
    <input type="text" autofocus ref="inputMessage" v-model="message" />
    <input :disabled="!this.message" type="submit" value="DUNK!" />
  </form>
</template>

<script>
import { store } from "../../functions/store";

export default {
  data() {
    return {
      message: null
    };
  },
  methods: {
    formPost() {
      store.writeBall(this.message);
      this.message = null;
      this.$refs.inputMessage.focus();
    }
  }
};
</script>
