<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">{{ $t("new_collection") }}</h3>
            <div>
              <button class="icon" @click="hideModal">
                <i class="material-icons">close</i>
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
            :placeholder="$t('my_new_collection')"
            @keyup.enter="addNewCollection"
          />
        </li>
      </ul>
    </div>
    <div slot="footer">
      <div class="flex-wrap">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="addNewCollection">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "../../functions/fb"

export default {
  props: {
    show: Boolean,
  },
  components: {
    modal: () => import("../../components/ui/modal"),
  },
  data() {
    return {
      name: undefined,
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    addNewCollection() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      this.$store.commit("postwoman/addNewCollection", {
        name: this.$data.name,
      })
      this.$emit("hide-modal")
      this.syncCollections()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
