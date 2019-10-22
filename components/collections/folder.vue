<template>
    <div>
        <div class="flex-wrap">
          <div>
            <button class="icon" @click="toggleShowChildren" v-show='!showChildren'>
              <i class="material-icons">arrow_right</i>
            </button>
            <button class="icon" @click="toggleShowChildren" v-show='showChildren'>
              <i class="material-icons">arrow_drop_down</i>
            </button>
            <button class="icon" @click="toggleShowChildren">
              <i class="material-icons">folder_open</i>
              <span>{{folder.name}}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="editFolder">
              <i class="material-icons">edit</i>
            </button>
            <button class="icon" @click="removeFolder">
              <i class="material-icons">delete</i>
            </button>
          </div>
        </div>

        <div v-show="showChildren">
            <ul>
                <li v-for="(request, index) in folder.requests" :key="index">
                    <request
                        :request="request"
                        :collection-index="collectionIndex"
                        :folder-index="folderIndex"
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
        padding-left: 1rem;
    }
</style>

<script>
import request from './request';

export default {
    props: {
        folder: Object,
        collectionIndex: Number,
        folderIndex: Number,
    },
    components: {
        request,
    },
    data () {
        return {
            showChildren: false,
        };
    },
    methods: {
        toggleShowChildren() {
            this.showChildren = !this.showChildren;
        },
        selectRequest(request) {
            this.$store.commit('postwoman/selectRequest', { request });
        },
        removeFolder() {
            if (!confirm("Are you sure you want to remove this folder?")) return;
            this.$store.commit('postwoman/removeFolder', {
                collectionIndex: this.collectionIndex,
                folderIndex: this.folderIndex,
            });
        },
        editFolder() {
            this.$emit('edit-folder', {
                collectionIndex: this.collectionIndex,
                folderIndex: this.folderIndex,
                folder: this.folder,
            });
        },
    }
};
</script>
