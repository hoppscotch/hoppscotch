<template>
    <div>
        <div class="header">
            <i @click="toggleShowChildren" v-show='!showChildren' class="material-icons">arrow_right</i>
            <i @click="toggleShowChildren" v-show='showChildren' class="material-icons">arrow_drop_down</i>
            <div @click="toggleShowChildren">{{folder.name}}</div>
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
    }
};
</script>