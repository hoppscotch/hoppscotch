<template>
  <div class="flex flex-col p-4 mx-4 bg-primaryLight rounded">
    <div class="flex flex-col items-center">
      <p class="my-4 font-semibold tracking-widest text-center">
        EMPOWERING DEVELOPERS FROM
      </p>
    </div>
    <div class="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6">
      <div
        v-for="(user, index) in users"
        :key="`user-${index}`"
        class="inline-flex flex-col items-center justify-center px-4"
      >
        <img
          :src="`/images/users/${user.image}`"
          alt="Profile picture"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center h-24 w-24"
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
