<template>
  <pw-section class="green" icon="history" :label="$t('environments')" ref="environments">
    <addEnvironment :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <editEnvironment
      :show="showModalEdit"
      :editingEnvironment="editingEnvironment"
      :editingEnvironmentIndex="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <importExportEnvironment
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayModalImportExport(true)">
          {{ $t("import_export") }}
        </button>
      </div>
    </div>
    <p v-if="environments.length === 0" class="info">
      Create new environment
    </p>
    <virtual-list
      class="virtual-list"
      :class="{ filled: environments.length }"
      :size="152"
      :remain="Math.min(5, environments.length)"
    >
      <ul>
        <li v-for="(environment, index) in environments" :key="environment.name">
          <environment
            :environmentIndex="index"
            :environment="environment"
            @edit-environment="editEnvironment(environment, index)"
            @select-environment="$emit('use-environment', environment)"
          />
        </li>
        <li v-if="environments.length === 0">
          <label>Environments are empty</label>
        </li>
      </ul>
    </virtual-list>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 241px);
}

ul {
  display: flex;
  flex-direction: column;
}
</style>

<script>
import environment from "./environment"
import { fb } from "../../functions/fb"

const updateOnLocalStorage = (propertyName, property) =>
  window.localStorage.setItem(propertyName, JSON.stringify(property))

export default {
  components: {
    environment,
    "pw-section": () => import("../layout/section"),
    addEnvironment: () => import("./addEnvironment"),
    editEnvironment: () => import("./editEnvironment"),
    importExportEnvironment: () => import("./importExportEnvironment"),
    VirtualList: () => import("vue-virtual-scroll-list"),
  },
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingEnvironment: undefined,
      editingEnvironmentIndex: undefined,
    }
  },
  computed: {
    environments() {
      return this.$store.state.postwoman.environments
    },
  },
  async mounted() {
    this._keyListener = function(e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalImportExport = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    editEnvironment(environment, environmentIndex) {
      this.$data.editingEnvironment = environment
      this.$data.editingEnvironmentIndex = environmentIndex
      this.displayModalEdit(true)
      this.syncEnvironments()
    },
    resetSelectedData() {
      this.$data.editingEnvironment = undefined
      this.$data.editingEnvironmentIndex = undefined
    },
    syncEnvironments() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
