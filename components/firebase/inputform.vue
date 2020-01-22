<template>
  <div>
    <ul>
      <li>
        <input
          :aria-label="$t('label')"
          type="text"
          autofocus
          v-model="message"
          :placeholder="$t('paste_a_collection')"
        />
      </li>
    </ul>
    <ul>
      <li>
        <input
          :aria-label="$t('label')"
          type="text"
          autofocus
          v-model="label"
          :placeholder="$t('label')"
        />
      </li>
      <button
        class="icon"
        :disabled="!(this.message && this.label)"
        value="Save"
        @click="formPost"
      >
        <i class="material-icons">add</i>
        <span>Add</span>
      </button>
    </ul>
  </div>
</template>

<script>
import { fb } from "../../functions/fb";

export default {
  data() {
    return {
      message: null,
      label: null
    };
  },
  methods: {
    formPost() {
      fb.writeFeed(this.message, this.label);
      this.message = null;
      this.label = null;
    }
  }
};
</script>
