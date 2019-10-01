<template>
    <modal v-if="show" @close="show = false">
        <div slot="header">
            <ul>
            <li>
                <div class="flex-wrap">
                <h3 class="title">Add New Folder</h3>
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
            <button @click="addNewFolder">Add</button>
        </div>
    </modal>
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
            newFolder: {
                name: '',
                requests: [],
            },
        }
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
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>