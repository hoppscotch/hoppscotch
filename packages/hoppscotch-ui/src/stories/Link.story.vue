<template>
  <Story title="Link">
    <Variant title="Text Link">
      <SmartLink :to="link" :blank="true"> Click here </SmartLink>
    </Variant>
    <Variant title="Button Link">
      <SmartLink :to="link" :blank="true">
        <ButtonPrimary label="Click here" />
      </SmartLink>
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"

const link = ref("/graphql")
</script>
