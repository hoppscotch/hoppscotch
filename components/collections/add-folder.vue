<template>
  <modal v-if="show" @close="show = false">
    <div slot="header">
      <ul>
        <li>
          <div class="row-wrapper">
            <h3 class="title">{{ $t("new_folder") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <closeIcon class="material-icons" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div slot="body">
      <ul>
        <li>
          <input
            type="text"
            v-model="name"
            :placeholder="$t('my_new_folder')"
            @keyup.enter="addFolder"
          />
        </li>
      </ul>
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="addFolder">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  components: {
    closeIcon,
  },
  props: {
    show: Boolean,
    folder: Object,
    folderPath: String,
    collectionIndex: Number,
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    addFolder() {
      this.$emit("add-folder", {
        name: this.name,
        folder: this.folder,
        path: this.folderPath || `${this.collectionIndex}`,
      })
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
