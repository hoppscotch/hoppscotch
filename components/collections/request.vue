<template>
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="selectRequest()">
          <i class="material-icons">star</i>
          <span>{{request.name}}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="editRequest">
          <i class="material-icons">edit</i>
        </button>
        <button class="icon" @click="removeRequest">
          <i class="material-icons">delete</i>
        </button>
      </div>
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
        editRequest() {
            this.request.requestIndex = this.requestIndex;
            this.$store.commit('postwoman/editRequest', { request: this.request });
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
