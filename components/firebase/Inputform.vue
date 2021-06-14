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

<script lang="ts">
import Vue from "vue"
import { writeFeed } from "~/helpers/fb/feeds"

export default Vue.extend({
  data() {
    return {
      message: null as string | null,
      label: null as string | null,
    }
  },
  methods: {
    formPost() {
      // TODO: Check this ?
      if (!(this.message || this.label)) {
        return
      }
      writeFeed(this.label as string, this.message as string)
      this.message = null
      this.label = null
    },
  },
})
</script>
