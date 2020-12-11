<template>
  <pw-section class="pink" :label="$t('notes')" ref="sync">
    <div v-if="fb.currentUser">
      <inputform />
      <feeds />
    </div>
    <div v-else>
      <ul>
        <li>
          <label>{{ $t("login_first") }}</label>
          <p>
            <login />
          </p>
        </li>
      </ul>
    </div>
  </pw-section>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
}
</script>
