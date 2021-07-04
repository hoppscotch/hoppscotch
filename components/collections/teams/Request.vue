<template>
  <div>
    <div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="!doc ? $t('use_request') : ''"
          @click.native="!doc ? selectRequest() : {}"
        />
        <i v-if="isSelected" class="mx-3 text-green-400 material-icons"
          >check_circle</i
        >

        <span v-else :class="getRequestLabelColor(request.method)">{{
          request.method
        }}</span>
        <span>{{ request.name }}</span>
      </div>
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
          />
          <i class="material-icons">more_vert</i>
        </template>
        <div>
          <ButtonSecondary
            @click.native="
              $emit('edit-request', {
                collectionIndex,
                folderIndex,
                folderName,
                request,
                requestIndex,
              })
            "
          />
          <i class="material-icons">edit</i>
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
      dragging: false,
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
