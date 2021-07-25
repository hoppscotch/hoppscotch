<template>
  <AppSection label="environments">
    <div class="bg-primary rounded-t flex flex-col top-10 z-10 sticky">
      <div class="select-wrapper">
        <select
          v-model="selectedEnvironmentIndex"
          :disabled="environments.length == 0"
          class="
            bg-primaryLight
            border-b border-dividerLight
            flex
            font-medium
            text-xs
            w-full
            py-3
            px-4
            focus:outline-none
            select
          "
        >
          <option :value="-1">No environment</option>
          <option v-if="environments.length === 0" value="0">
            {{ $t("create_new_environment") }}
          </option>
          <option
            v-for="(environment, index) in environments"
            :key="`environment-${index}`"
            :value="index"
          >
            {{ environment.name }}
          </option>
        </select>
      </div>
      <div class="border-b border-dividerLight flex flex-1 justify-between">
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
    <div
      v-if="environments.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">library_add</i>
      <span class="text-xs text-center">
        {{ $t("create_new_environment") }}
      </span>
    </div>
    <div class="flex flex-col">
      <EnvironmentsEnvironment
        v-for="(environment, index) in environments"
        :key="`environment-${index}`"
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
