<template>
  <pw-section class="green" icon="history" :label="$t('environments')" ref="environments">
    <add-environment :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <edit-environment
      :show="showModalEdit"
      :editingEnvironment="editingEnvironment"
      :editingEnvironmentIndex="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <import-export-environment
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="row-wrapper">
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
      <i class="material-icons">help_outline</i> {{ $t("create_new_environment") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(environment, index) in environments" :key="environment.name">
          <environment
            :environmentIndex="index"
            :environment="environment"
            @edit-environment="editEnvironment(environment, index)"
            @select-environment="
              $emit('use-environment', { environment: environment, environments: environments })
            "
          />
        </li>
      </ul>
    </div>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 232px);
}
</style>

<script>
import { fb } from "~/helpers/fb"

export default {
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
      return fb.currentUser !== null
        ? fb.currentEnvironments
        : this.$store.state.postwoman.environments
    },
  },
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalImportExport = this.showModalAdd = this.showModalEdit = false
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
