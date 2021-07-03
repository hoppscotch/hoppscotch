<template>
  <div>
    <div class="row-wrapper">
      <div>
        <ButtonSecondary @click.native="$emit('edit-environment')" />
        <i class="material-icons">layers</i>
        <span>{{ environment.name }}</span>
      </div>
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary v-tippy="{ theme: 'tooltip' }" :title="$t('more')" />
          <i class="material-icons">more_vert</i>
        </template>
        <div>
          <ButtonSecondary @click.native="$emit('edit-environment')" />
          <i class="material-icons">create</i>
          <span>{{ $t("edit") }}</span>
        </div>
        <div>
          <ButtonSecondary @click.native="confirmRemove = true" />
          <i class="material-icons">delete</i>
          <span>{{ $t("delete") }}</span>
        </div>
      </tippy>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_environment')"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { deleteEnvironment } from "~/newstore/environments"

export default Vue.extend({
  props: {
    environment: { type: Object, default: () => {} },
    environmentIndex: { type: Number, default: null },
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  methods: {
    removeEnvironment() {
      deleteEnvironment(this.environmentIndex)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
