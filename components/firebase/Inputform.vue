<template>
  <div class="flex-col">
    <div class="show-on-large-screen">
      <input
        v-model="message"
        :aria-label="$t('label')"
        type="text"
        autofocus
        :placeholder="$t('paste_a_note')"
        class="rounded-t-lg"
        @keyup.enter="formPost"
      />
    </div>
    <div class="border-b show-on-large-screen border-divider">
      <input
        v-model="label"
        :aria-label="$t('label')"
        type="text"
        autofocus
        :placeholder="$t('label')"
        @keyup.enter="formPost"
      />
      <button
        class="icon"
        :disabled="!(message || label)"
        value="Save"
        @click="formPost"
      >
        <i class="material-icons">add</i>
        <span>Add</span>
      </button>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      message: null,
      label: null,
    }
  },
  methods: {
    formPost() {
      if (!(this.message || this.label)) {
        return
      }
      fb.writeFeeds(this.message, this.label)
      this.message = null
      this.label = null
    },
  },
}
</script>
