<template>
    <div>
        <modal v-if="show" @close="hideModal">
            <div slot="header">
            <ul>
                <li>
                <div class="flex-wrap">
                  <h3 class="title">New Collection</h3>
                  <div>
                    <button class="icon" @click="hideModal" >
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
                  <input type="text" v-model="name" placeholder="My New Collection" />
                </li>
            </ul>
            </div>
            <div slot="footer">
              <ul>
                <li>
                  <button class="icon" @click="addNewCollection">
                    <i class="material-icons">add</i>
                    <span>Create</span>
                  </button>
                </li>
              </ul>
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
          name: undefined,
        }
    },
    methods: {
        addNewCollection() {
            this.$store.commit('postwoman/addNewCollection', { name: this.$data.name })
            this.$emit('hide-modal')
        },
        hideModal() {
            this.$emit('hide-modal')
        },
    },
};
</script>
