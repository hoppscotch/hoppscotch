import Vue from 'vue';
import Toast from '@nuxtjs/toast';
import i18n from 'nuxt-i18n';
import Store from 'vuex-persist';
import axios from '@nuxtjs/axios';

declare module 'vue/types/vue' {
  interface Vue {
    $axios: axios.NuxtAxiosInstance
  }
}
