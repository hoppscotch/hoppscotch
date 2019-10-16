<template>
    <div>
        <div class="header">
            <i @click="toggleShowChildren" v-show='!showChildren' class="material-icons">arrow_right</i>
            <i @click="toggleShowChildren" v-show='showChildren' class="material-icons">arrow_drop_down</i>
            <div @click="toggleShowChildren">{{folder.name}}</div>
            <button class="add-button" @click="editFolder">e</button>
            <button class="add-button" @click="removeFolder">x</button>
        </div>

        <div v-show="showChildren">
            <ul>
                <li v-for="request in folder.requests" :key="request.name">
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

    .add-button {
        padding: 0;
        width: 20px;
        margin: 0;
        height: 20px;
        border-radius: 50%;
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