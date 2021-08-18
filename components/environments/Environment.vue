<template>
  <div class="flex items-center group">
    <span
      class="cursor-pointer flex w-10 justify-center items-center truncate"
      @click="$emit('edit-environment')"
    >
      <i class="material-icons">layers</i>
    </span>
    <span
      class="
        cursor-pointer
        flex flex-1
        min-w-0
        py-2
        pr-2
        transition
        group-hover:text-secondaryDark
      "
      @click="$emit('edit-environment')"
    >
      <span class="truncate">
        {{ environment.name }}
      </span>
    </span>
    <span>
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('action.more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="create"
          :label="$t('action.edit')"
          @click.native="
            $emit('edit-environment')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="!(environmentIndex === 'Global')"
          icon="delete"
          color="red"
          :label="$t('action.delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </span>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('confirm.remove_environment')"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script lang="ts">
import { PropType } from "@nuxtjs/composition-api"
import Vue from "vue"
import { deleteEnvironment } from "~/newstore/environments"

export default Vue.extend({
  props: {
    environment: { type: Object, default: () => {} },
    environmentIndex: {
      type: [Number, String] as PropType<number | "Global">,
      default: null,
    },
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  methods: {
    removeEnvironment() {
      if (this.environmentIndex !== "Global")
        deleteEnvironment(this.environmentIndex)
      this.$toast.error(this.$t("state.deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
