<template>
  <pw-section class="green" icon="history" :label="$t('environments')" ref="environments">
    <div class="show-on-large-screen">
      <ul class="w-full">
        <li>
          <label for="currentEnvironment">{{ $t("select_environment") }}</label>
          <span class="select-wrapper">
            <select
              id="currentEnvironment"
              v-model="selectedEnvironmentIndex"
              :disabled="environments.length == 0"
            >
              <option :value="-1">No environment</option>
              <option v-if="environments.length === 0" value="0">
                {{ $t("create_new_environment") }}
              </option>
              <option v-for="(environment, index) in environments" :value="index" :key="index">
                {{ environment.name }}
              </option>
            </select>
          </span>
        </li>
      </ul>
    </div>
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
      selectedEnvironmentIndex: -1,
      defaultEnvironment: {
        name: "My Environment Variables",
        variables: [],
      },
    }
  },
  computed: {
    environments() {
      return fb.currentUser !== null
        ? fb.currentEnvironments
        : this.$store.state.postwoman.environments
    },
  },
  watch: {
    selectedEnvironmentIndex(val) {
      if (val === -1)
        this.$emit("use-environment", {
          environment: this.defaultEnvironment,
          environments: this.environments,
        })
      else
        this.$emit("use-environment", {
          environment: this.environments[val],
          environments: this.environments,
        })
    },
    environments: {
      handler(val) {
        if (val.length === 0) {
          this.selectedEnvironmentIndex = -1
          this.$emit("use-environment", {
            environment: this.defaultEnvironment,
            environments: this.environments,
          })
        } else {
          if (this.environments[this.selectedEnvironmentIndex])
            this.$emit("use-environment", {
              environment: this.environments[this.selectedEnvironmentIndex],
              environments: this.environments,
            })
          else this.selectedEnvironmentIndex = -1
        }
      },
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
