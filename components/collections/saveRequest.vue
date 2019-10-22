<template>
    <div>
        <modal v-if="show" @close="hideModel">
            <div slot="header">
                <ul>
                    <li>
                        <div class="flex-wrap">
                            <h3 class="title" v-if='!request.hasOwnProperty("requestIndex")'>Add New Request</h3>
                            <h3 class="title" v-if='request.hasOwnProperty("requestIndex")'>Edit Request</h3>
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
                        <input type="text" v-model="request.name" placeholder="My New Request" />
                        <select type="text" v-model="request.collection" >
                            <option 
                                v-for="collection in collections"
                                :key="collection.collectionIndex"
                                :value="collection.collectionIndex">
                                {{ collection.name }}
                            </option>
                        </select>
                        <select type="text" v-model="request.folder" >
                            <option 
                                v-for="folder in folders"
                                :key="folder.folderIndex"
                                :value="folder.folderIndex">
                                {{ folder.name }}
                            </option>
                        </select>
                    </li>
                </ul>
            </div>
            <div slot="footer">
                <button @click="addRequest" v-if='!request.hasOwnProperty("requestIndex")'>Add</button>
                <button @click="saveRequest" v-if='request.hasOwnProperty("requestIndex")'>Save</button>
            </div>
        </modal>
    </div>
</template>

<script>
import modal from "../../components/modal";

export default {
    props: {
        show: Boolean,
        editingRequest: Object,
    },
    components: {
        modal,
    },
    data() {
        return {
            request: {
                name: '',
                collection: '',
                folder: -1,
            },
        }
    },
    watch: {
        show() {
            this.request = Object.assign(this.request, this.editingRequest);
        },
        'request.collection': function (newValue, oldValue) {
            if (!oldValue) return;

            if (newValue === oldValue) {
                delete this.request.oldCollection;
                return;
            }
            this.request.oldFolder = this.request.folder;
            this.request.folder = -1;
            this.request.oldCollection = oldValue;
        },
        'request.folder': function (newValue, oldValue) {
            if (!oldValue) return;

            if (newValue === oldValue) {
                delete this.request.oldFolder;
                return;
            }
            this.request.oldFolder = oldValue;
        }
    },
    computed: {
        collections() {
            return this.$store.state.postwoman.collections
                .map((collection, index) => {
                    return {
                        name: collection.name,
                        collectionIndex: index,
                    };
                });
        },
        folders() {
            if (this.request.collection === '') return []
            return this.$store.state.postwoman.collections[this.request.collection].folders
                .map((folder, index) => {
                    return {
                        name: folder.name,
                        folderIndex: index,
                    };
                });
        }
    },
    methods: {
        addRequest() {
            const request = Object.assign({}, this.request);
            this.$store.commit('postwoman/addRequest', {
                request,
            });
            this.request = {
                name: '',
                collection: '',
                folder: '',
            };
            this.hideModel();
        },
        saveRequest() {
            const savedRequest = Object.assign({}, this.request);

            this.$store.commit('postwoman/saveRequest', {
                request: savedRequest,
            });

            this.request = {
                name: '',
                collection: '',
                folder: '',
            };
            this.hideModel();
        },
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>