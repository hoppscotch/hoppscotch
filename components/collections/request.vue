<template>
    <div @click='selectRequest()'>
        {{request.name}}
        <button class="add-button" @click="removeRequest">x</button>
    </div>
</template>

<style scoped>
    .add-button {
        padding: 0;
        width: 20px;
        margin: 0;
        height: 20px;
        border-radius: 50%;
    }
</style>

<script>
export default {
    props: {
        request: Object,
        collectionIndex: Number,
        folderIndex: Number,
        requestIndex: Number,
    },
    methods: {
        selectRequest() {
            this.$store.commit('postwoman/selectRequest', { request: this.request });
        },
        removeRequest() {
            if (!confirm("Are you sure you want to remove this request?")) return;
            this.$store.commit('postwoman/removeRequest', {
                collectionIndex: this.collectionIndex,
                folderIndex: this.folderIndex,
                requestIndex: this.requestIndex,
            });
        },
    },
};
</script>