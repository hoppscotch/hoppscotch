<template>
  <div class="flex-col">
    <div class="show-on-large-screen">
      <input
        :aria-label="$t('label')"
        type="text"
        autofocus
        v-model="message"
        :placeholder="$t('paste_a_note')"
        @keyup.enter="formPost"
        class="rounded-t-lg"
      />
    </div>
    <div class="border-b show-on-large-screen border-brdColor">
      <input
        :aria-label="$t('label')"
        type="text"
        autofocus
        v-model="label"
        :placeholder="$t('label')"
        @keyup.enter="formPost"
      />
      <button class="icon" :disabled="!(this.message || this.label)" value="Save" @click="formPost">
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
