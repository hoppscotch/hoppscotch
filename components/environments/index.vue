<template>
  <AppSection label="environments">
    <div
      class="
        bg-primary
        rounded-t
        flex flex-col
        top-sidebarPrimaryStickyFold
        z-10
        sticky
      "
    >
      <div class="select-wrapper">
        <select
          v-model="selectedEnvironmentIndex"
          :disabled="environments.length == 0"
          class="
            bg-primaryLight
            border-b border-dividerLight
            flex
            w-full
            py-2
            px-4
            appearance-none
            focus:outline-none
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
          class="rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          icon="import_export"
          :title="$t('modal.import_export')"
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
      <span class="text-center pb-4">
        {{ $t("empty.environments") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        outline
        @click.native="displayModalAdd(true)"
      />
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

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useReadonlyStream, useStream } from "~/helpers/utils/composables"
import {
  environments$,
  setCurrentEnvironment,
  selectedEnvIndex$,
  Environment,
} from "~/newstore/environments"

export default defineComponent({
  setup() {
    return {
      environments: useReadonlyStream(environments$, []),
      selectedEnvironmentIndex: useStream(
        selectedEnvIndex$,
        -1,
        setCurrentEnvironment
      ),
    }
  },
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingEnvironment: undefined as Environment | undefined,
      editingEnvironmentIndex: undefined as number | undefined,
    }
  },
  methods: {
    displayModalAdd(shouldDisplay: boolean) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay: boolean) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay: boolean) {
      this.showModalImportExport = shouldDisplay
    },
    editEnvironment(environment: Environment, environmentIndex: number) {
      this.$data.editingEnvironment = environment
      this.$data.editingEnvironmentIndex = environmentIndex
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingEnvironment = undefined
      this.$data.editingEnvironmentIndex = undefined
    },
  },
})
</script>
