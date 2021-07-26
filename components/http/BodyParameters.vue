<template>
  <AppSection label="bodyParameters">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-24
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label for="reqParamList" class="font-semibold">
        {{ $t("request_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent('bodyParams', $event)"
        />
      </div>
    </div>
    <div
      v-for="(param, index) in bodyParams"
      :key="`param-${index}`"
      class="
        divide-x divide-dashed divide-divider
        border-b border-dashed border-divider
        flex
      "
      :class="{ 'border-t': index == 0 }"
    >
      <input
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('parameter_count', { count: index + 1 })"
        :name="'param' + index"
        :value="param.key"
        autofocus
        @change="updateBodyParams($event, index, `setKeyBodyParams`)"
        @keyup.prevent="setRouteQueryState"
      />
      <input
        v-if="!requestBodyParamIsFile(index)"
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('value_count', { count: index + 1 })"
        :name="'value' + index"
        :value="param.value"
        @change="
          // if input is form data, set value to be an array containing the value
          // only
          updateBodyParams($event, index, `setValueBodyParams`)
        "
        @keyup.prevent="setRouteQueryState"
      />
      <div v-else class="file-chips-container">
        <div class="file-chips-wrapper">
          <SmartDeletableChip
            v-for="(file, fileIndex) in Array.from(bodyParams[index].value)"
            :key="`param-${index}-file-${fileIndex}`"
            @chip-delete="chipDelete(index, fileIndex)"
          >
            {{ file.name }}
          </SmartDeletableChip>
        </div>
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="
            param.hasOwnProperty('active')
              ? param.active
                ? $t('turn_off')
                : $t('turn_on')
              : $t('turn_off')
          "
          :icon="
            param.hasOwnProperty('active')
              ? param.active
                ? 'check_box'
                : 'check_box_outline_blank'
              : 'check_box'
          "
          color="green"
          @click.native="toggleActive(index, param)"
        />
      </div>
      <div>
        <label for="attachment" class="p-0">
          <ButtonSecondary
            class="w-full"
            icon="attach_file"
            @click.native="$refs.attachment[index].click()"
          />
        </label>
        <input
          ref="attachment"
          class="input"
          name="attachment"
          type="file"
          multiple
          @change="setRequestAttachment($event, index)"
        />
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
          color="red"
          @click.native="removeRequestBodyParam(index)"
        />
      </div>
    </div>
  </AppSection>
</template>

<script>
export default {
  props: {
    bodyParams: { type: Array, default: () => [] },
  },
  computed: {
    contentType() {
      return this.$store.state.request.contentType
    },
  },
  watch: {
    bodyParams: {
      handler(newValue) {
        if (
          newValue[newValue.length - 1]?.key !== "" ||
          newValue[newValue.length - 1]?.value !== ""
        )
          this.addRequestBodyParam()
      },
      deep: true,
    },
  },
  mounted() {
    if (!this.bodyParams?.length) {
      this.addRequestBodyParam()
    }
  },
  methods: {
    clearContent(bodyParams, $event) {
      this.$emit("clear-content", bodyParams, $event)
    },
    setRouteQueryState() {
      this.$emit("set-route-query-state")
    },
    removeRequestBodyParam(index) {
      const paramArr = this.$store.state.request.bodyParams.filter(
        (item, itemIndex) =>
          itemIndex !== index &&
          (Object.prototype.hasOwnProperty.call(item, "active")
            ? item.active === true
            : true)
      )
      this.setRawParams(paramArr)
      this.$emit("remove-request-body-param", index)
    },
    addRequestBodyParam() {
      this.$emit("add-request-body-param")
    },
    setRequestAttachment(event, index) {
      const { files } = event.target
      this.$store.commit("setFilesBodyParams", {
        index,
        value: Array.from(files),
      })
    },
    requestBodyParamIsFile(index) {
      const bodyParamValue = this.bodyParams?.[index]?.value
      const isFile = bodyParamValue?.[0] instanceof File
      return isFile
    },
    chipDelete(paramIndex, fileIndex) {
      this.$store.commit("removeFile", {
        index: paramIndex,
        fileIndex,
      })
    },
    updateBodyParams(event, index, type) {
      this.$store.commit(type, {
        index,
        value: event.target.value,
      })
      const paramArr = this.$store.state.request.bodyParams.filter((item) =>
        Object.prototype.hasOwnProperty.call(item, "active")
          ? item.active === true
          : true
      )

      this.setRawParams(paramArr)
    },
    toggleActive(index, param) {
      const paramArr = this.$store.state.request.bodyParams.filter(
        (item, itemIndex) => {
          if (index === itemIndex) {
            return !param.active
          } else {
            return Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          }
        }
      )

      this.setRawParams(paramArr)

      this.$store.commit("setActiveBodyParams", {
        index,
        value: Object.prototype.hasOwnProperty.call(param, "active")
          ? !param.active
          : false,
      })
    },
    setRawParams(filteredParamArr) {
      let rawParams = {}
      filteredParamArr.forEach((_param) => {
        rawParams = {
          ...rawParams,
          [_param.key]: _param.value,
        }
      })
      const rawParamsStr = JSON.stringify(rawParams, null, 2)
      this.$store.commit("setState", {
        value: rawParamsStr,
        attribute: "rawParams",
      })
    },
  },
}
</script>

<style scoped lang="scss">
.file-chips-container {
  @apply flex flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-primaryDark;

  .file-chips-wrapper {
    @apply flex;
    @apply w-0;
  }
}
</style>
