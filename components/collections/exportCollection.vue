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
              <ul>
                <li>
                <button class="icon" @click="exportJSON">
                  <i class="material-icons">get_app</i>
                  <span>Export JSON</span>
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
    computed: {
        collectionJson () {
            return JSON.stringify(this.$store.state.postwoman.collections, null, 2);
        }
    },
    methods: {
        hideModel() {
            this.$emit('hide-model');
        },
        exportJSON() {
          let text = this.collectionJson;
          text = text.replace(/\n/g, '\r\n');
          let blob = new Blob([text], {
            type: 'text/json'
          });
          let anchor = document.createElement('a');
          anchor.download = 'postwoman-collection.json';
          anchor.href = window.URL.createObjectURL(blob);
          anchor.target = '_blank';
          anchor.style.display = 'none';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        }
    },
};
</script>
