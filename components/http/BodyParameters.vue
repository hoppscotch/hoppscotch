<template>
  <AppSection label="bodyParameters">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold">
        {{ $t("request_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add.new')"
          icon="add"
          @click.native="addBodyParam"
        />
      </div>
    </div>
    <div
      v-for="(param, index) in bodyParams"
      :key="`param-${index}`"
      class="divide-x divide-dividerLight border-b border-dividerLight flex"
      :class="{ 'border-t': index == 0 }"
    >
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="param.key"
        :placeholder="$t('count.parameter', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-1
          px-4
          focus:outline-none
        "
        @change="
          updateBodyParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
          })
        "
      />
      <input
        v-else
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('count.parameter', { count: index + 1 })"
        :name="'param' + index"
        :value="param.key"
        autofocus
        @change="
          updateBodyParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
          })
        "
      />
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED && !requestBodyParamIsFile(index)"
        v-model="param.value"
        :placeholder="$t('count.value', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-1
          px-4
          focus:outline-none
        "
        @change="
          updateBodyParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
      />
      <input
        v-if="!EXPERIMENTAL_URL_BAR_ENABLED && !requestBodyParamIsFile(index)"
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('count.value', { count: index + 1 })"
        :name="'value' + index"
        :value="param.value"
        @change="
          updateBodyParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
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
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="
          param.hasOwnProperty('active')
            ? param.active
              ? $t('action.turn_off')
              : $t('action.turn_on')
            : $t('action.turn_off')
        "
        :icon="
          param.hasOwnProperty('active')
            ? param.active
              ? 'check_box'
              : 'check_box_outline_blank'
            : 'check_box'
        "
        color="green"
        @click.native="
          updateBodyParam(index, {
            key: param.key,
            value: param.value,
            active: param.hasOwnProperty('active') ? !param.active : false,
          })
        "
      />
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
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('delete')"
        icon="delete"
        color="red"
        @click.native="deleteBodyParam(index)"
      />
    </div>
    <div
      v-if="bodyParams.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">post_add</i>
      <span class="text-center pb-4">
        {{ $t("empty.parameters") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        outline
        @click.native="addBodyParam"
      />
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
          (newValue[newValue.length - 1]?.key !== "" ||
            newValue[newValue.length - 1]?.value !== "") &&
          newValue.length
        )
          this.addBodyParam()
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
    clearContent() {
      this.$emit("clear-content")
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
