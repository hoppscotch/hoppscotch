<template>
  <div id="app" class="font-sans max-w-md mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">Hoppscotch Interceptor</h1>
    <div v-if="!authenticated" class="space-y-4">
      <h2 class="text-xl font-semibold">Your OTP</h2>
      <div v-if="otp" class="flex items-center space-x-2">
        <input
          v-model="otp"
          readonly
          class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="copyOTP"
          class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >Copy</button>
      </div>
      <p v-else class="text-sm text-gray-600">Waiting for OTP from web application...</p>
    </div>
    <div v-else class="space-y-2">
      <h2 class="text-xl font-semibold text-green-600">Authenticated!</h2>
      <p>
        <span class="font-semibold">Auth Key:</span>
        {{ authKey }}
      </p>
      <p>
        <span class="font-semibold">Expiry:</span>
        {{ authExpiry }}
      </p>
    </div>
    <p v-if="error" class="mt-4 text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { listen } from "@tauri-apps/api/event";
import { Resource, invoke } from "@tauri-apps/api/core";

const otp = ref("");
const error = ref("");
const authenticated = ref(false);
const authKey = ref("");
const authExpiry = ref("");

onMounted(async () => {
  try {
    await listen("otp_received", (event) => {
      otp.value = event.payload;
    });
  } catch (err) {
    error.value = "Failed to set up event listener.";
  }
});

function copyOTP() {
  // TODO: Show a "Copied!" message?
  navigator.clipboard.writeText(otp.value);
}
</script>
