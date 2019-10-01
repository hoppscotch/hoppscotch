<template>
    <div @click='selectRequest()'>
        {{request.name}}
    </div>
</template>

<script>
export default {
    props: {
        request: Object,
    },
    methods: {
        selectRequest() {
            this.$store.commit('postwoman/selectRequest', { request: this.request });
        },
    }
}
</script>