<template>
  <form @submit.prevent="formPost">
    <input type="text" autofocus ref="inputMessage" v-model="message" />
    <input :disabled="!this.message" type="submit" value="Save" />
  </form>
</template>

<script>
import { fb } from "../../functions/fb";

export default {
  data() {
    return {
      message: null
    };
  },
  methods: {
    formPost() {
      fb.writeFeed(this.message);
      this.message = null;
    }
  }
};
</script>
