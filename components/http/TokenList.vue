<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">{{ $t("manage_token") }}</h3>
        <div>
          <button class="icon button" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <div class="row-wrapper">
        <label>{{ $t("token_list") }}</label>
        <div v-if="tokens.length != 0">
          <button
            v-tooltip.bottom="$t('clear')"
            class="icon button"
            @click="clearContent('tokens', $event)"
          >
            <i class="material-icons">clear_all</i>
          </button>
        </div>
      </div>
      <ul v-for="(token, index) in tokens" :key="index">
        <li>
          <input
            class="input"
            :placeholder="`name ${index + 1}`"
            :value="token.name"
            @change="
              $store.commit('setOAuthTokenName', {
                index,
                value: $event.target.value,
              })
            "
          />
        </li>
        <li>
          <input class="input" :value="token.value" readonly />
        </li>
        <div class="row-wrapper">
          <li>
            <button
              v-tooltip.bottom="$t('use_token')"
              class="icon button"
              @click="useOAuthToken(token.value)"
            >
              <i class="material-icons">input</i>
            </button>
          </li>
          <li>
            <button
              v-tooltip.bottom="$t('delete')"
              class="icon button"
              @click="removeOAuthToken(index)"
            >
              <i class="material-icons">delete</i>
            </button>
          </li>
        </div>
      </ul>
      <p v-if="tokens.length === 0" class="info">
        {{ $t("empty") }}
      </p>
    </div>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
    tokens: { type: Array, default: () => [] },
  },
  methods: {
    clearContent(tokens, $event) {
      this.$emit("clear-content", tokens, $event)
    },
    useOAuthToken(token) {
      this.$emit("use-oauth-token", token)
    },
    removeOAuthToken(index) {
      this.$emit("remove-oauth-token", index)
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
