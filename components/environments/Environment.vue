<template>
  <div>
    <div class="row-wrapper">
      <div>
        <ButtonSecondary
          icon="layers"
          :label="environment.name"
          @click.native="$emit('edit-environment')"
        />
      </div>
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <div>
          <ButtonSecondary
            icon="create"
            :label="$t('edit')"
            @click.native="$emit('edit-environment')"
          />
        </div>
        <div>
          <ButtonSecondary
            icon="delete"
            :label="$t('delete')"
            @click.native="confirmRemove = true"
          />
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
