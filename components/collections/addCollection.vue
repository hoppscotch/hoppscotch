<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <ul>
        <li>
          <div class="flex-wrap">
            <h3 class="title">New Collection</h3>
            <div>
              <button class="icon" @click="hideModal">
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
      <div class="flex-wrap">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            Cancel
          </button>
          <button class="icon primary" @click="addNewCollection">
            Save
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
export default {
  props: {
    show: Boolean
  },
  components: {
    modal: () => import("../../components/modal")
  },
  data() {
    return {
      name: undefined
    };
  },
  methods: {
    addNewCollection() {
      this.$store.commit("postwoman/addNewCollection", {
        name: this.$data.name
      });
      this.$emit("hide-modal");
    },
    hideModal() {
      this.$emit("hide-modal");
    }
  }
};
</script>
