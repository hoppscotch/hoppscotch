<template>
  <modal v-if="show" @close="hideModel">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">Edit Collection</h3>
            <div>
              <button class="icon" @click="hideModel">
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
      <ul>
        <li>
          <button class="icon" @click="saveCollection">
            <i class="material-icons">save</i>
            <span>Save</span>
          </button>
        </li>
      </ul>
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
    hideModel() {
      this.$emit("hide-modal");
    }
  }
};
</script>
