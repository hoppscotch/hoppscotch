<template>
  <div class="bg-primaryLight rounded flex flex-col mx-6 p-4">
    <div class="flex flex-col items-center">
      <p class="font-semibold my-4 text-center tracking-widest">
        EMPOWERING DEVELOPERS FROM
      </p>
    </div>
    <div class="grid gap-4 grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      <div
        v-for="(user, index) in users"
        :key="`user-${index}`"
        class="flex-col px-4 inline-flex items-center justify-center"
      >
        <img
          :src="`/images/users/${user.image}`"
          alt="Profile picture"
          loading="lazy"
          class="flex-col object-contain object-center h-24 w-24 inline-flex"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: [
        { title: "Accenture", image: "accenture.svg" },
        { title: "ByteDance", image: "bytedance.svg" },
        { title: "Decathlon", image: "decathlon.svg" },
        { title: "GitHub", image: "github.svg" },
        { title: "Gojek", image: "gojek.svg" },
        { title: "Google", image: "google.svg" },
        { title: "Microsoft", image: "microsoft.svg" },
        { title: "PayTM", image: "paytm.svg" },
        { title: "Twilio", image: "twilio.svg" },
        { title: "Udemy", image: "udemy.svg" },
        { title: "Zendesk", image: "zendesk.svg" },
        { title: "Zoho", image: "zoho.svg" },
      ],
    }
  },
}
</script>
