import axios from "axios";

const proxyStrategy = async (req, store) => {
  const { data } = await axios.post(
    store.state.postwoman.settings.PROXY_URL ||
      "https://postwoman.apollotv.xyz/",
    req
  );
  window.$nuxt.$loading.finish();
  return data;
};

export default proxyStrategy;
