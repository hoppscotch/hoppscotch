<template>
    <div>
        <addFolder
            v-bind:show="showModal"
            v-on:new-folder="addNewFolder"
            v-on:hide-model='toggleModal'
            v-bind:editing-folder="selectedFolder"
            v-on:saved-folder="savedFolder"
        >
        </addFolder>

        <div class="flex-wrap">
          <div>
            <button class="icon" @click="toggleShowChildren">
              <i class="material-icons" v-show='!showChildren'>arrow_right</i>
              <i class="material-icons" v-show='showChildren'>arrow_drop_down</i>
              <i class="material-icons">folder</i>
              <span>{{collection.name}}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="editCollection" v-tooltip="'Edit collection'">
              <i class="material-icons">create</i>
            </button>
            <button class="icon" @click="removeCollection" v-tooltip="'Delete collection'">
              <i class="material-icons">delete</i>
            </button>
            <button class="icon" @click="toggleModal" v-tooltip="'New Folder'">
              <i class="material-icons">add</i>
            </button>
          </div>
        </div>

        <div v-show="showChildren">
            <ul>
                <li v-for="(folder, index) in collection.folders" :key="folder.name">
                    <folder
                        :folder="folder"
                        :folderIndex="index"
                        :collection-index="collectionIndex"
                        v-on:edit-folder="editFolder"
                    />
                </li>
            </ul>

            <ul>
                <li v-for="(request, index) in collection.requests" :key="index">
                    <request
                        :request="request"
                        :collection-index="collectionIndex"
                        :folder-index="-1"
                        :request-index="index"
                    ></request>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
    ul {
        display: flex;
        flex-direction: column;
    }

    ul li {
        display: flex;
        padding-left: 16px;
        border-left: 1px solid var(--brd-color);
    }
</style>

<script>
import folder from './folder';
import addFolder from "./addFolder";
import request from './request';

export default {
    components: {
        folder,
        addFolder,
        request,
    },
    props: {
        collectionIndex: Number,
        collection: Object,
    },
    data () {
        return {
            showChildren: false,
            showModal: false,
            selectedFolder: {},
        };
    },
    methods: {
        toggleShowChildren() {
            this.showChildren = !this.showChildren;
        },
        toggleModal() {
            this.showModal = !this.showModal;
        },
        addNewFolder(newFolder) {
            this.$store.commit('postwoman/addFolder', {
                collectionIndex: this.collectionIndex,
                folder: newFolder,
            });
            this.showModal = false;
        },
        editCollection() {
            this.$emit('edit-collection', {
                collectionIndex: this.collectionIndex,
                collection: this.collection,
            });
        },
        removeCollection() {
            if (!confirm("Are you sure you want to remove this collection?")) return;
            this.$store.commit('postwoman/removeCollection', {
                collectionIndex: this.collectionIndex,
            });
        },
        editFolder(payload) {
            const { folder, collectionIndex, folderIndex } = payload;
            this.selectedFolder = Object.assign({ collectionIndex, folderIndex }, folder);
            this.showModal = true;
        },
        savedFolder(savedFolder) {
            this.$store.commit('postwoman/saveFolder', { savedFolder });
            this.showModal = false;
            this.selectedFolder = {};
        },
    }
};
</script>
