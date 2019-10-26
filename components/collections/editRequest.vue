<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">Edit Request</h3>
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
          <input type="text" v-model="requestUpdateData.name" v-bind:placeholder="request.name" />
          <select type="text" v-model="requestUpdateData.collectionIndex">
            <option
              v-for="(collection, index) in $store.state.postwoman.collections"
              :key="index"
              :value="index"
            >{{ collection.name }}</option>
          </select>
          <select type="text" v-model="requestUpdateData.folderIndex">
            <option :key="undefined" :value="undefined"></option>
            <option v-for="(folder, index) in folders" :key="index" :value="index">{{ folder.name }}</option>
          </select>
        </li>
      </ul>
    </div>
    <div slot="footer">
      <ul>
        <li>
          <button class="icon" @click="saveRequest">
            <i class="material-icons">save</i>
            <span>Save</span>
          </button>
        </li>
      </ul>
    </div>
  </modal>
</template>

<script>
  import modal from "../../components/modal";

  export default {
    props: {
      show: Boolean,
      collectionIndex: Number,
      folderIndex: Number,
      request: Object,
      requestIndex: Number
    },
    components: {
      modal
    },
    data() {
      return {
        requestUpdateData: {
          name: undefined,
          collectionIndex: undefined,
          folderIndex: undefined
        }
      };
    },
    watch: {
      "requestUpdateData.collectionIndex": function resetFolderIndex() {
        // if user choosen some folder, than selected other collection, which doesn't have any folders
        // than `requestUpdateData.folderIndex` won't be reseted
        this.$data.requestUpdateData.folderIndex = undefined;
      }
    },
    computed: {
      folders() {
        const userSelectedAnyCollection =
          this.$data.requestUpdateData.collectionIndex !== undefined;
        if (!userSelectedAnyCollection) return [];

        return this.$store.state.postwoman.collections[
          this.$data.requestUpdateData.collectionIndex
        ].folders;
      }
    },
    methods: {
      saveRequest() {
        const userSelectedAnyCollection =
          this.$data.requestUpdateData.collectionIndex !== undefined;

        const requestUpdated = {
          ...this.$props.request,
          name: this.$data.requestUpdateData.name || this.$props.request.name,
          collection: userSelectedAnyCollection
            ? this.$data.requestUpdateData.collectionIndex
            : this.$props.collectionIndex,
          folder: this.$data.requestUpdateData.folderIndex
        };

        // pass data separately to don't depend on request's collection, folder fields
        // probably, they should be deprecated because they don't describe request itself
        this.$store.commit("postwoman/editRequest", {
          requestOld: this.$props.request,
          requestOldCollectionIndex: this.$props.collectionIndex,
          requestOldFolderIndex: this.$props.folderIndex,
          requestOldIndex: this.$props.requestIndex,
          requestNew: requestUpdated,
          requestNewCollectionIndex: requestUpdated.collection,
          requestNewFolderIndex: requestUpdated.folder
        });

        this.hideModal();
      },
      hideModal() {
        this.$emit("hide-modal");
      }
    }
  };
</script>
