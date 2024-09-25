<template>
  <div>
    <h2>Enter OTP</h2>
    <div class="otp-container">
      <input
        v-for="(digit, index) in otpDigits"
        :key="index"
        v-model="otpDigits[index]"
        type="text"
        maxlength="1"
        class="otp-input"
        @input="onInput(index)"
        @keydown="onKeydown(index, $event)"
      />
    </div>
  </div>
</template>

