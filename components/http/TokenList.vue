<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("manage_token") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="row-wrapper">
        <label>{{ $t("token_list") }}</label>
        <div v-if="tokens.length != 0">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('clear')"
            icon="clear_all"
            @click.native="clearContent('tokens', $event)"
          />
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
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('use_token')"
              icon="input"
              @click.native="useOAuthToken(token.value)"
            />
          </li>
          <li>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('delete')"
              icon="delete"
              @click.native="removeOAuthToken(index)"
            />
          </li>
        </div>
      </ul>
      <p v-if="tokens.length === 0" class="info">
        {{ $t("empty") }}
      </p>
    </template>
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
