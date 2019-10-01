<template>
    <div>
        <modal v-if="show" @close="hideModel">
            <div slot="header">
            <ul>
                <li>
                <div class="flex-wrap">
                    <h3 class="title">Add New Collection</h3>
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
                <button @click="addNewCollection">Add</button>
            </div>
        </modal>
    </div>
</template>

<script>
import modal from "../../components/modal";

export default {
    props: {
        show: Boolean,
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
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>