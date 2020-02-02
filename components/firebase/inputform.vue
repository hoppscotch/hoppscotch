<template>
  <div>
    <ul>
      <li>
        <input
          :aria-label="$t('label')"
          type="text"
          autofocus
          v-model="message"
          :placeholder="$t('paste_a_note')"
          @keyup.enter="formPost"
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
          @keyup.enter="formPost"
        />
      </li>
      <button
        class="icon"
        :disabled="!(this.message || this.label)"
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
      if (!(this.message || this.label)) {
        return;
      }
      fb.writeFeeds(this.message, this.label);
      this.message = null;
      this.label = null;
    }
  }
};
</script>
