<template>
    <div>
        <addFolder
            v-bind:show="showModal"
            v-on:new-folder="addNewFolder"
            v-on:hide-model='toggleModal'>
        </addFolder>

        <div class="header">
            <i @click="toggleShowChildren" v-show='!showChildren' class="material-icons">arrow_right</i>
            <i @click="toggleShowChildren" v-show='showChildren' class="material-icons">arrow_drop_down</i>
            <label @click="toggleShowChildren">
                {{collection.name}}
            </label>
            <button class="add-button" @click="editCollection">e</button>
            <button class="add-button" @click="removeCollection">x</button>
            <button class="add-button" @click="toggleModal">+</button>
        </div>
        
        <div v-show="showChildren">
            <ul>
                <li v-for="(folder, index) in collection.folders" :key="folder.name">
                    <folder :folder="folder" :folderIndex="index" :collection-index="collectionIndex" />
                </li>
            </ul>

            <ul>
                <li v-for="request in collection.requests" :key="request.name">
                    <request :request="request"></request>
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
        padding-left: 1rem;
    }

    .header {
        display: flex;
        align-items: center;
    }

    label {
        padding-left: .5rem;
    }

    .add-button {
        padding: 0;
        width: 20px;
        margin: 0;
        height: 20px;
        border-radius: 50%;
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
    }
};
</script>