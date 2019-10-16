<template>
    <div>
        <modal v-if="show" @close="hideModel">
            <div slot="header">
            <ul>
                <li>
                <div class="flex-wrap">
                    <h3 class="title" v-if='!newCollection.hasOwnProperty("collectionIndex")'>Add New Collection</h3>
                    <h3 class="title" v-if='newCollection.hasOwnProperty("collectionIndex")'>Edit Collection</h3>
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
                    <input type="text" v-model="newCollection.name" placeholder="My New Collection" />
                </li>
            </ul>
            </div>
            <div slot="footer">
                <button @click="addNewCollection" v-if='!newCollection.hasOwnProperty("collectionIndex")'>Add</button>
                <button @click="saveCollection" v-if='newCollection.hasOwnProperty("collectionIndex")'>Save</button>
            </div>
        </modal>
    </div>
</template>

<script>
import modal from "../../components/modal";

export default {
    props: {
        show: Boolean,
        editingCollection: Object,
    },
    components: {
        modal,
    },
    data() {
        return {
            newCollection: {
                name: '',
                folders: [],
                requests: [],
            },
        }
    },
    watch: {
        show() {
            if (!this.editingCollection.collectionIndex);
            this.newCollection = Object.assign({}, this.editingCollection);
        },
    },
    methods: {
        addNewCollection() {
            const newCollection = Object.assign({}, this.newCollection);
            this.$emit('new-collection', newCollection);
            this.newCollection = {
                name: '',
                folders: [],
                requests: [],
            };
        },
        saveCollection() {
            const savedCollection = Object.assign({}, this.newCollection);
            this.$emit('saved-collection', savedCollection);
            this.newCollection = {
                name: '',
                folders: [],
                requests: [],
            };
        },
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>