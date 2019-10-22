<template>
    <div>
        <modal v-if="show" @close="hideModel">
            <div slot="header">
            <ul>
                <li>
                <div class="flex-wrap">
                    <h3 class="title">Export Collections</h3>
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
              <textarea v-model='collectionJson' rows="8">
              </textarea>
            </div>
            <div slot="footer">
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
    computed: {
        collectionJson () {
            return JSON.stringify(this.$store.state.postwoman.collections, null, 2);
        }
    },
    methods: {
        hideModel() {
            this.$emit('hide-model');
        },
    },
};
</script>
