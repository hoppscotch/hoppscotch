<template>
  <div>
    <h1>HTTP Interceptor</h1>
    <p>Registration Key: {{ registrationKey }}</p>
    <button @click="showOTPInput" v-if="!isAuthenticated">Authenticate</button>
    <OTPInput v-if="showOTP" @complete="validateOTP" />
    <div v-if="isAuthenticated">
      <h2>Authenticated Successfully!</h2>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
