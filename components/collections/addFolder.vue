<template>
    <modal v-if="show" @close="show = false">
        <div slot="header">
            <ul>
            <li>
              <div class="flex-wrap">
                <h3 class="title" v-if='!newFolder.hasOwnProperty("folderIndex")'>New Folder</h3>
                <h3 class="title" v-if='newFolder.hasOwnProperty("folderIndex")'>Edit Folder</h3>
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
                <input type="text" v-model="newFolder.name" placeholder="My New Folder" />
            </li>
            </ul>
        </div>
        <div slot="footer">
          <ul>
            <li>
            <button class="icon" @click="addNewFolder" v-if='!newFolder.hasOwnProperty("folderIndex")'>
              <i class="material-icons">add</i>
              <span>Create</span>
            </button>
            <button class="icon" @click="saveFolder" v-if='newFolder.hasOwnProperty("folderIndex")'>
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
        editingFolder: Object,
    },
    components: {
        modal,
    },
    data() {
        return {
            newFolder: {
                name: '',
                requests: [],
            },
        }
    },
    watch: {
        show() {
            if (!this.editingFolder.folderIndex) return;
            this.newFolder = Object.assign({}, this.editingFolder);
        },
    },
    methods: {
        addNewFolder() {
            const newFolder = Object.assign({}, this.newFolder);
            this.$emit('new-folder', newFolder);
            this.newFolder = {
                name: '',
                requests: [],
            };
        },
        saveFolder() {
            const savedFolder = Object.assign({}, this.newFolder);
            this.$emit('saved-folder', savedFolder);
            this.newFolder = {
                name: '',
                requests: [],
            };
        },
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>
