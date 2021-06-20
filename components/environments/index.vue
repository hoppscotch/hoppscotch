<template>
  <AppSection ref="environments" :label="$t('environments')">
    <div class="show-on-large-screen">
      <span class="select-wrapper">
        <select
          v-model="selectedEnvironmentIndex"
          :disabled="environments.length == 0"
          class="rounded-t-lg"
        >
          <option :value="-1">No environment</option>
          <option v-if="environments.length === 0" value="0">
            {{ $t("create_new_environment") }}
          </option>
          <option
            v-for="(environment, index) in environments"
            :key="index"
            :value="index"
          >
            {{ environment.name }}
          </option>
        </select>
      </span>
    </div>
    <EnvironmentsAdd
      :show="showModalAdd"
      @hide-modal="displayModalAdd(false)"
    />
    <EnvironmentsEdit
      :show="showModalEdit"
      :editing-environment="editingEnvironment"
      :editing-environment-index="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="border-b row-wrapper border-divider">
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
      <i class="material-icons">help_outline</i>
      {{ $t("create_new_environment") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li
          v-for="(environment, index) in environments"
          :key="environment.name"
        >
          <EnvironmentsEnvironment
            :environment-index="index"
            :environment="environment"
            @edit-environment="editEnvironment(environment, index)"
          />
        </li>
      </ul>
    </div>
  </AppSection>
</template>

<script>
import {
  environments$,
  setCurrentEnvironment,
  selectedEnvIndex$,
} from "~/newstore/environments"

export default {
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingEnvironment: undefined,
      editingEnvironmentIndex: undefined,
      selectedEnvironmentIndex: -1,
    }
  },
  subscriptions() {
    return {
      environments: environments$,
      selectedEnvironmentIndex: selectedEnvIndex$,
    }
  },
  watch: {
    selectedEnvironmentIndex(val) {
      setCurrentEnvironment(val)
    },
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
    },
    resetSelectedData() {
      this.$data.editingEnvironment = undefined
      this.$data.editingEnvironmentIndex = undefined
    },
  },
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
}
</style>
