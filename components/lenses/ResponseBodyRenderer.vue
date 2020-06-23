<template>
  <div>
    <tabs>
      <tab
        v-for="(lens, index) in validLenses"
        :key="lens.lensName"
        :id="lens.lensName"
        :label="lens.lensName"
        :selected="index == 0"
      >
        <component :is="lens.renderer" :response="response" />
      </tab>
    </tabs>
  </div>
</template>

<script>
import getSuitableLenses from "~/helpers/lenses/lenses"

export default {
  components: {
    tabs: () => import("../ui/tabs"),
    tab: () => import("../ui/tab"),
    // Lens Renderers
    raw: () => import("../lenses/renderers/RawLensRenderer"),
    json: () => import("../lenses/renderers/JSONLensRenderer"),
    imageres: () => import("../lenses/renderers/ImageLensRenderer"),
    htmlres: () => import("../lenses/renderers/HTMLLensRenderer"),
  },
  props: {
    response: {},
  },
  computed: {
    validLenses() {
      return getSuitableLenses(this.response)
    },
  },
}
</script>
