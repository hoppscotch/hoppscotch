<template>
  <div>
    <ul class="flex-col">
      <div class="show-on-large-screen">
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
      </div>
      <div class="show-on-large-screen">
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
          <addIcon class="material-icons" />
          <span>Add</span>
        </button>
      </div>
    </ul>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import addIcon from "~/static/icons/add-24px.svg?inline"

export default {
  components: { addIcon },
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
