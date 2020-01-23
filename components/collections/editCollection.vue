<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">{{ $t("edit_collection") }}</h3>
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
            :placeholder="editingCollection.name"
            @keyup.enter="saveCollection"
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
          <button class="icon primary" @click="saveCollection">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
export default {
  props: {
    show: Boolean,
    editingCollection: Object,
    editingCollectionIndex: Number
  },
  components: {
    modal: () => import("../../components/modal")
  },
  data() {
    return {
      name: undefined
    };
  },
  methods: {
    saveCollection() {
      if (!this.$data.name) {
        this.$toast.info('Please provide a valid name for the collection');
        return;
      }
      const collectionUpdated = {
        ...this.$props.editingCollection,
        name: this.$data.name
      };
      this.$store.commit("postwoman/editCollection", {
        collection: collectionUpdated,
        collectionIndex: this.$props.editingCollectionIndex
      });
      this.$emit("hide-modal");
    },
    hideModal() {
      this.$emit("hide-modal");
    }
  }
};
</script>
