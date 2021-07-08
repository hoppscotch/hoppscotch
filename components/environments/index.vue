<template>
  <AppSection label="environments">
    <select
      v-model="selectedEnvironmentIndex"
      :disabled="environments.length == 0"
      class="
        flex
        w-full
        px-4
        text-xs
        py-2
        focus:outline-none
        border-b border-dividerLight
      "
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
    <div class="border-b flex justify-between flex-1 border-dividerLight">
      <ButtonSecondary
        icon="add"
        :label="$t('new')"
        @click.native="displayModalAdd(true)"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="import_export"
        :title="$t('import_export')"
        @click.native="displayModalImportExport(true)"
      />
    </div>
    <div
      v-if="environments.length === 0"
      class="flex items-center text-secondaryLight flex-col p-4 justify-center"
    >
      <i class="material-icons opacity-50 pb-2">library_add</i>
      <span class="text-xs">
        {{ $t("create_new_environment") }}
      </span>
    </div>
    <div class="flex flex-col">
      <EnvironmentsEnvironment
        v-for="(environment, index) in environments"
        :key="environment.name"
        :environment-index="index"
        :environment="environment"
        @edit-environment="editEnvironment(environment, index)"
      />
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
