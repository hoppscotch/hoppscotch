<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
      <span
        class="
          font-mono font-bold
          flex
          justify-center
          items-center
          text-xs
          w-12
          truncate
          cursor-pointer
        "
        :class="[
          getRequestLabelColor(request.method),
          { 'mx-3 text-green-400': isSelected },
        ]"
        @click="!doc ? selectRequest() : {}"
      >
        <i v-if="isSelected" class="material-icons">check_circle</i>
        {{ request.method }}
      </span>
      <span
        class="
          py-3
          cursor-pointer
          pr-3
          flex flex-1
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
        "
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate"> {{ request.name }} </span>
      </span>
      <tippy
        v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
        ref="options"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="edit"
          :label="$t('edit')"
          @click.native="
            $emit('edit-request', {
              collectionIndex,
              folderIndex,
              folderName,
              request,
              requestIndex,
            })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="delete"
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script>
export default {
  props: {
    request: { type: Object, default: () => {} },
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    // eslint-disable-next-line vue/require-default-prop
    requestIndex: [Number, String],
    doc: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      requestMethodLabels: {
        get: "text-green-400",
        post: "text-yellow-400",
        put: "text-blue-400",
        delete: "text-red-400",
        default: "text-gray-400",
      },
      confirmRemove: false,
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "teams-request" &&
        this.picked.requestID === this.requestIndex
      )
    },
  },
  methods: {
    selectRequest() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-request",
            requestID: this.requestIndex,
          },
        })
      else
        this.$store.commit("postwoman/selectRequest", { request: this.request })
    },
    removeRequest() {
      this.$emit("remove-request", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        requestIndex: this.$props.requestIndex,
      })
    },
    getRequestLabelColor(method) {
      return (
        this.requestMethodLabels[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
  },
}
</script>
