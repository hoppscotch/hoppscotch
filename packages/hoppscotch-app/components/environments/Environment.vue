<template>
  <div class="flex items-center group">
    <span
      class="cursor-pointer flex px-4 justify-center items-center"
      @click="$emit('edit-environment')"
    >
      <SmartIcon class="svg-icons" name="layers" />
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
            svg="more-vertical"
          />
        </template>
        <SmartItem
          svg="edit"
          :label="$t('action.edit')"
          @click.native="
            $emit('edit-environment')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="!(environmentIndex === 'Global')"
          svg="trash-2"
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
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { deleteEnvironment } from "~/newstore/environments"

export default defineComponent({
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
      this.$toast.success(this.$t("state.deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
